## List Database Tables
Lists all tables and views in specified database schemas, providing a quick overview of database structure to help identify available tables before fetching detailed schemas.

## Select From Table
Tool to select rows from a Supabase table. Use for read-only queries with filtering, sorting, and pagination.

## Execute project database query
Executes a given SQL query against the project's database; use for advanced data operations or when standard API endpoints are insufficient, ensuring queries are valid PostgreSQL and sanitized. Use the get_table_schemas or generate_type_script_types tool to retrieve the table schema, then base your query on it.