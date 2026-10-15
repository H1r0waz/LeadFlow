import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import Field, StrictBool, ValidationError, field_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import authenticated_write, current_auth
from app.db import get_db
from app.lead_schemas import LeadCreate
from app.leads import commit_lead
from app.models import Activity, Lead, User
from app.schemas import StrictInput

router = APIRouter(prefix="/api/v1/csv", tags=["csv"])
MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 5000
FIELDS = tuple(LeadCreate.model_fields)


class CSVInput(StrictInput):
    csv_text: str = Field(max_length=MAX_BYTES)

    @field_validator("csv_text")
    @classmethod
    def bounded_text(cls, value):
        try:
            size = len(value.encode("utf-8"))
        except UnicodeEncodeError:
            raise ValueError("CSV must contain valid UTF-8 text") from None
        if size > MAX_BYTES:
            raise ValueError("CSV exceeds the 2 MiB limit")
        if "\x00" in value or "\ufffd" in value:
            raise ValueError("CSV contains invalid text characters; use UTF-8")
        return value


class CSVMapping(CSVInput):
    mapping: dict[str, str]


class CSVImport(CSVMapping):
    confirm: StrictBool
    allow_partial: StrictBool = False


def parse_csv(value: str):
    # The byte limit bounds individual fields too; avoid csv's lower default cap.
    csv.field_size_limit(MAX_BYTES)
    try:
        reader = csv.reader(
            io.StringIO(value.removeprefix("\ufeff"), newline=""), strict=True
        )
        headers = [header.strip() for header in next(reader, [])]
        if not headers or len(headers) > 32 or any(not header for header in headers):
            raise HTTPException(422, "CSV requires 1–32 nonblank column headers")
        if len(headers) != len(set(headers)):
            raise HTTPException(422, "CSV column headers must be unique")
        rows = []
        for row in reader:
            rows.append(row)
            if len(rows) > MAX_ROWS:
                raise HTTPException(422, "CSV exceeds the 5,000 row limit")
        return headers, rows
    except csv.Error:
        raise HTTPException(
            422, "Malformed CSV; use comma-separated UTF-8 CSV"
        ) from None


def mapped_rows(body: CSVMapping, db: Session, user_id):
    headers, rows = parse_csv(body.csv_text)
    if (
        "name" not in body.mapping
        or set(body.mapping) - set(FIELDS)
        or any(header not in headers for header in body.mapping.values())
        or len(set(body.mapping.values())) != len(body.mapping)
    ):
        raise HTTPException(
            422, "Map name and supported fields to distinct CSV columns"
        )
    positions = {field: headers.index(header) for field, header in body.mapping.items()}
    seen = set(
        db.scalars(
            select(Lead.email).where(Lead.user_id == user_id, Lead.email.is_not(None))
        )
    )
    reports = []
    for number, row in enumerate(rows, start=2):
        report = {"row_number": number, "status": "invalid", "data": {}, "errors": []}
        if len(row) != len(headers):
            report["errors"] = ["Column count does not match the header"]
        else:
            data = {field: row[index] for field, index in positions.items()}
            data = {
                field: value
                for field, value in data.items()
                if field == "name" or value.strip()
            }
            try:
                lead = LeadCreate.model_validate(data)
                report["data"] = lead.model_dump(mode="json")
                if lead.email and str(lead.email) in seen:
                    report["status"] = "duplicate"
                    report["errors"] = [
                        "Email already exists in your leads or an earlier valid row"
                    ]
                else:
                    report["status"] = "valid"
                    if lead.email:
                        seen.add(str(lead.email))
            except ValidationError as exc:
                report["data"] = data
                report["errors"] = [
                    f"{error['loc'][0]}: {error['msg']}" for error in exc.errors()
                ]
        reports.append(report)
    return reports


@router.post("/inspect")
def inspect_csv(body: CSVInput, auth=Depends(authenticated_write)):
    headers, rows = parse_csv(body.csv_text)
    return {"headers": headers, "sample_rows": rows[:5], "total_rows": len(rows)}


@router.post("/preview")
def preview_csv(
    body: CSVMapping, auth=Depends(authenticated_write), db: Session = Depends(get_db)
):
    rows = mapped_rows(body, db, auth[0].id)
    return {
        "total_rows": len(rows),
        "valid_rows": sum(row["status"] == "valid" for row in rows),
        "duplicate_rows": sum(row["status"] == "duplicate" for row in rows),
        "invalid_rows": sum(row["status"] == "invalid" for row in rows),
        "rows": rows,
    }


@router.post("/import")
def import_csv(
    body: CSVImport, auth=Depends(authenticated_write), db: Session = Depends(get_db)
):
    if not body.confirm:
        raise HTTPException(422, "Confirm the import before continuing")
    # Serialize imports for this owner, then revalidate against current persisted leads.
    db.scalar(select(User).where(User.id == auth[0].id).with_for_update())
    rows = mapped_rows(body, db, auth[0].id)
    rejected = sum(row["status"] == "invalid" for row in rows)
    if rejected and not body.allow_partial:
        db.rollback()
        raise HTTPException(
            409,
            "CSV contains invalid rows; fix them or explicitly allow a partial import",
        )
    for row in rows:
        if row["status"] == "valid":
            lead = Lead(
                user_id=auth[0].id,
                **LeadCreate.model_validate(row["data"]).model_dump(),
            )
            db.add(lead)
            # commit_lead also translates concurrent email uniqueness conflicts to 409.
            try:
                db.flush()
            except IntegrityError as exc:
                db.rollback()
                if (
                    getattr(exc.orig, "sqlstate", None) == "23505"
                    and getattr(
                        getattr(exc.orig, "diag", None), "constraint_name", None
                    )
                    == "uq_leads_user_email"
                ):
                    raise HTTPException(
                        409,
                        "A lead with this email already exists; preview the CSV again",
                    ) from None
                raise
            db.add(
                Activity(
                    lead_id=lead.id,
                    user_id=lead.user_id,
                    type="lead_created",
                    description="Lead created from CSV",
                )
            )
    commit_lead(db)
    return {
        "imported": sum(row["status"] == "valid" for row in rows),
        "skipped": sum(row["status"] == "duplicate" for row in rows),
        "rejected": rejected,
        "total_rows": len(rows),
        "rows": rows,
    }


def spreadsheet_safe(value):
    text = "" if value is None else str(value)
    if text.startswith(("=", "+", "-", "@", "\t", "\r")) or text.lstrip().startswith(
        ("=", "+", "-", "@")
    ):
        return "'" + text
    return text


@router.get("/export")
def export_csv(auth=Depends(current_auth), db: Session = Depends(get_db)):
    output = io.StringIO(newline="")
    output.write("\ufeff")
    writer = csv.writer(output)
    writer.writerow(FIELDS)
    leads = db.scalars(
        select(Lead)
        .where(Lead.user_id == auth[0].id)
        .order_by(Lead.created_at, Lead.id)
    )
    for lead in leads:
        writer.writerow([spreadsheet_safe(getattr(lead, field)) for field in FIELDS])
    return Response(
        output.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="leadflow-leads.csv"'},
    )
