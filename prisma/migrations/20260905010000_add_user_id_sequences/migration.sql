-- ============================================================
-- SCHOOL USER ID SEQUENCES
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS admin_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1;

SELECT setval(
    'admin_id_seq',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
            FROM "Admin"
            WHERE id ~ '^ADM[0-9]+$'
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM "Admin"
        WHERE id ~ '^ADM[0-9]+$'
    )
);

CREATE SEQUENCE IF NOT EXISTS teacher_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1;

SELECT setval(
    'teacher_id_seq',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
            FROM "Teacher"
            WHERE id ~ '^TCH[0-9]+$'
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM "Teacher"
        WHERE id ~ '^TCH[0-9]+$'
    )
);

CREATE SEQUENCE IF NOT EXISTS student_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1;

SELECT setval(
    'student_id_seq',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
            FROM "Student"
            WHERE id ~ '^STU[0-9]+$'
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM "Student"
        WHERE id ~ '^STU[0-9]+$'
    )
);

CREATE SEQUENCE IF NOT EXISTS parent_id_seq
    START WITH 1
    INCREMENT BY 1
    MINVALUE 1;

SELECT setval(
    'parent_id_seq',
    COALESCE(
        (
            SELECT MAX(CAST(SUBSTRING(id FROM 4) AS INTEGER))
            FROM "Parent"
            WHERE id ~ '^PAR[0-9]+$'
        ),
        1
    ),
    EXISTS (
        SELECT 1
        FROM "Parent"
        WHERE id ~ '^PAR[0-9]+$'
    )
);