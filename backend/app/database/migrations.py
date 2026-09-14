"""
Minimal auto-migration for both local SQLite dev databases and the production
PostgreSQL/Aiven database.

create_all() creates missing TABLES but never ALTERs existing ones, so a database
provisioned from an earlier version of the schema would be missing newly-added
columns and every query touching them would fail with "column does not exist"
(Postgres) / "no such column" (SQLite). This scans each mapped model against the
actual DB schema and adds any missing columns with a safe default.

This is additive-only (it only ever ADDs a missing column, never modifies or
drops an existing one), which is why it's safe to run unconditionally on every
startup, in both dev and production. For anything beyond simple additive
columns, replace with real Alembic migrations.
"""
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def _default_sql(column, dialect_name: str) -> str:
    default_sql = "NULL"
    if column.default is not None and getattr(column.default, "arg", None) is not None and not callable(column.default.arg):
        val = column.default.arg
        if isinstance(val, bool):
            default_sql = ("TRUE" if val else "FALSE") if dialect_name == "postgresql" else ("1" if val else "0")
        elif isinstance(val, (int, float)):
            default_sql = str(val)
        elif isinstance(val, str):
            default_sql = f"'{val.replace(chr(39), chr(39) * 2)}'"
    return default_sql


def run_schema_autopatch(engine: Engine, base) -> None:
    """Adds any columns present on the SQLAlchemy models but missing from the actual
    database table. Supports the sqlite (local dev) and postgresql (production/Aiven)
    dialects this project actually runs on; any other dialect is left untouched."""
    dialect_name = engine.dialect.name
    if dialect_name not in ("sqlite", "postgresql"):
        return

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

                col_type = column.type.compile(dialect=engine.dialect)
                default_sql = _default_sql(column, dialect_name)

                if dialect_name == "postgresql":
                    conn.execute(text(
                        f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{column.name}" {col_type} DEFAULT {default_sql}'
                    ))
                else:
                    conn.execute(text(
                        f'ALTER TABLE "{table_name}" ADD COLUMN "{column.name}" {col_type} DEFAULT {default_sql}'
                    ))
                print(f"[auto-migrate] Added missing column {table_name}.{column.name} ({dialect_name})")


# Backward-compatible name — main.py imports this.
run_sqlite_autopatch = run_schema_autopatch