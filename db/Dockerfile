FROM flyway/flyway:latest

COPY migrations /flyway/sql
COPY flyway.conf /flyway/conf

ENTRYPOINT ["flyway", "migrate"]

