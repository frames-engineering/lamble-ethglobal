> ## Documentation Index
> Fetch the complete documentation index at: https://docs.allium.so/llms.txt
> Use this file to discover all available pages before exploring further.

# Fetch query run status

Check the execution status of a query run. Use this endpoint to poll for completion after [running a query](/api/explorer/run-query).

## Query Run Statuses

| Status     | Description                                   |
| :--------- | :-------------------------------------------- |
| `created`  | Query has been created                        |
| `queued`   | Query has been queued for execution           |
| `running`  | Query is currently executing                  |
| `success`  | Query has successfully executed               |
| `failed`   | Query execution failed                        |
| `canceled` | Query was canceled, likely due to user action |


## OpenAPI

````yaml get /api/v1/explorer/query-runs/{run_id}/status
openapi: 3.0.2
info:
  title: Allium API
  version: 0.1.0
servers:
  - url: https://api.allium.so
security: []
paths:
  /api/v1/explorer/query-runs/{run_id}/status:
    get:
      summary: Get Query Run Status
      operationId: get_query_run_status_api_v1_explorer_query_runs__run_id__status_get
      parameters:
        - required: true
          schema:
            type: string
            title: Run Id
          name: run_id
          in: path
      responses:
        '200':
          description: Successful Response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/QueryRunStatus'
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
    QueryRunStatus:
      title: QueryRunStatus
      enum:
        - created
        - queued
        - running
        - success
        - failed
        - canceled
      type: string
      description: An enumeration.
    HTTPValidationError:
      title: HTTPValidationError
      type: object
      properties:
        detail:
          title: Detail
          type: array
          items:
            $ref: '#/components/schemas/ValidationError'
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
  securitySchemes:
    APIKeyBearer:
      type: apiKey
      in: header
      name: X-API-KEY

````