> ## Documentation Index
> Fetch the complete documentation index at: https://docs.allium.so/llms.txt
> Use this file to discover all available pages before exploring further.

# Fetch query run results

Retrieve the results of a completed query run. Ensure the query status is `success` before calling this endpoint by [checking the status](/api/explorer/fetch-query-run-status) first.

## Response Fields

| Field          | Description                                                |
| :------------- | :--------------------------------------------------------- |
| `sql`          | The SQL query executed in the request                      |
| `data`         | The results of the query encoded as a list of JSON objects |
| `meta`         | Metadata about the results                                 |
| `meta.columns` | List of the data's column names and types                  |
| `queried_at`   | The timestamp at which the query was executed              |


## OpenAPI

````yaml get /api/v1/explorer/query-runs/{run_id}/results
openapi: 3.0.2
info:
  title: Allium API
  version: 0.1.0
servers:
  - url: https://api.allium.so
security: []
paths:
  /api/v1/explorer/query-runs/{run_id}/results:
    get:
      summary: Get Query Run Results
      operationId: get_query_run_results_api_v1_explorer_query_runs__run_id__results_get
      parameters:
        - required: true
          schema:
            type: string
            title: Run Id
          name: run_id
          in: path
        - required: false
          schema:
            allOf:
              - $ref: '#/components/schemas/ResponseFormat'
            default: json
          name: f
          in: query
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryResult'
        '422':
          description: Validation Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HTTPValidationError'
      security:
        - APIKeyBearer: []
components:
  schemas:
    ResponseFormat:
      title: ResponseFormat
      enum:
        - json
        - json_file
        - csv
      type: string
      description: An enumeration.
    QueryResult:
      title: QueryResult
      required:
        - sql
        - meta
      type: object
      properties:
        sql:
          title: Sql
          type: string
        data:
          title: Data
        meta:
          $ref: '#/components/schemas/QueryResultMeta'
        queried_at:
          title: Queried At
          type: string
          format: date-time
    HTTPValidationError:
      title: HTTPValidationError
      type: object
      properties:
        detail:
          title: Detail
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
    QueryResultMeta:
      title: QueryResultMeta
      required:
        - columns
      type: object
      properties:
        columns:
          title: Columns
          type: array
          items:
            $ref: '#/components/schemas/QueryResultMetaColumn'
    ValidationError:
      title: ValidationError
      required:
        - loc
        - msg
        - type
      type: object
      properties:
        loc:
          title: Location
          type: array
          items:
            anyOf:
              - type: string
              - type: integer
        msg:
          title: Message
          type: string
        type:
          title: Error Type
          type: string
    QueryResultMetaColumn:
      title: QueryResultMetaColumn
      required:
        - name
        - data_type
      type: object
      properties:
        name:
          type: string
          title: Name
        data_type:
          title: Data Type
          type: string
  securitySchemes:
    APIKeyBearer:
      type: apiKey
      in: header
      name: X-API-KEY

````