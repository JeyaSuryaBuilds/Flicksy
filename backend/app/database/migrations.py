"""
Minimal auto-migration for local SQLite development only.

create_all() creates missing TABLES but never ALTERs existing ones, so a flicksy.db
from an earlier version of the schema would be missing newly-added columns and every
query touching them would fail with "no such column". This scans each mapped model
against the actual DB schema and adds any missing columns with a safe default.

This is a development convenience, not a migration system — for Postgres/production,
replace this with real Alembic migrations before you have data you care about.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


_SQLITE_TYPE_MAP = {
    "VARCHAR": "TEXT", "STRING": "TEXT", "TEXT": "TEXT",
    "BOOLEAN": "BOOLEAN", "INTEGER": "INTEGER", "DATETIME": "DATETIME",
}


def run_sqlite_autopatch(engine: Engine, base) -> None:
    if not str(engine.url).startswith("sqlite"):
        return  # only auto-patch local SQLite dev DBs

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table_name, table in base.metadata.tables.items():
            if table_name not in existing_tables:
                continue  # brand-new table — create_all already handled it

            existing_columns = {c["name"] for c in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name in existing_columns:
                    continue

                col_type = _SQLITE_TYPE_MAP.get(column.type.__class__.__name__.upper(), "TEXT")
                default_sql = "NULL"
                if column.default is not None and getattr(column.default, "arg", None) is not None and not callable(column.default.arg):
                    val = column.default.arg
                    if isinstance(val, bool):
                        default_sql = "1" if val else "0"
                    elif isinstance(val, (int, float)):
                        default_sql = str(val)
                    elif isinstance(val, str):
                        default_sql = f"'{val}'"

                conn.execute(text(f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type} DEFAULT {default_sql}'))
                print(f"[auto-migrate] Added missing column {table_name}.{column.name}")
