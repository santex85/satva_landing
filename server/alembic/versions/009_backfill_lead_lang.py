"""Backfill payload.lang for leads using consent referer."""

from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE leads l
        SET payload = jsonb_set(COALESCE(l.payload, '{}'::jsonb), '{lang}', to_jsonb(inferred.lang::text), true)
        FROM (
            SELECT l2.id,
                CASE
                    WHEN l2.payload->>'lang' IN ('en', 'ru') THEN l2.payload->>'lang'
                    WHEN EXISTS (
                        SELECT 1 FROM consents c
                        WHERE c.lead_id = l2.id
                          AND (c.referer ILIKE '%/ru/%' OR c.referer ILIKE '%/ru')
                    ) THEN 'ru'
                    WHEN EXISTS (
                        SELECT 1 FROM consents c
                        WHERE c.lead_id = l2.id
                          AND (
                            c.referer ~* 'satvasamui\\.(com|site)/?($|[?#])'
                            OR c.referer ILIKE '%www.satvasamui.com%'
                          )
                    ) THEN 'en'
                    ELSE 'ru'
                END AS lang
            FROM leads l2
            WHERE l2.payload->>'lang' IS NULL OR l2.payload->>'lang' NOT IN ('en', 'ru')
        ) inferred
        WHERE l.id = inferred.id
          AND (l.payload->>'lang' IS NULL OR l.payload->>'lang' NOT IN ('en', 'ru'))
        """
    )


def downgrade() -> None:
    pass
