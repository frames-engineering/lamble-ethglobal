> ## Documentation Index
> Fetch the complete documentation index at: https://docs.dune.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Execute SQL

> Execute raw SQL queries directly without needing to create a saved query first

<Info>
  Minimum required API key scope: `Read`
</Info>

> Run arbitrary SQL queries via API. This endpoint allows you to execute SQL directly without first creating a query object, perfect for dynamic analysis and automated workflows.

<Note>
  When executing arbitrary SQL queries (queries not saved in Dune), the `query_id` in the response will always be `0`. This is a placeholder value since these queries are not stored in the Dune database.
</Note>

## Pricing

This endpoint is **usage-based** and consumes credits based on the computational resources used during execution.

<RequestExample>
  ```bash cURL theme={null}
  curl -X POST "https://api.dune.com/api/v1/sql/execute" \
    -H "Content-Type: application/json" \
    -H "X-Dune-Api-Key: YOUR_API_KEY" \
    -d '{
      "sql": "SELECT * FROM dex.trades WHERE block_time > now() - interval '\''1'\'' day LIMIT 10",
      "performance": "medium"
    }'
  ```

  ```python Python theme={null}
  import requests

  url = "https://api.dune.com/api/v1/sql/execute"
  headers = {
      "X-DUNE-API-KEY": "YOUR_API_KEY",
      "Content-Type": "application/json"
  }
  data = {
      "sql": "SELECT * FROM dex.trades WHERE block_time > now() - interval '1' day LIMIT 10",
      "performance": "medium"
  }

  response = requests.post(url, json=data, headers=headers)
  print(response.json())
  ```

  ```javascript JavaScript theme={null}
  const response = await fetch('https://api.dune.com/api/v1/sql/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DUNE-API-KEY': 'YOUR_API_KEY'
    },
    body: JSON.stringify({
      sql: "SELECT * FROM dex.trades WHERE block_time > now() - interval '1' day LIMIT 10",
      performance: 'medium'
    })
  });

  const data = await response.json();
  console.log(data);
  ```

  ```bash Complete Workflow theme={null}
  # Step 1: Execute SQL and get execution ID
  EXECUTION_ID=$(curl -s -X POST "https://api.dune.com/api/v1/sql/execute" \
    -H "Content-Type: application/json" \
    -H "X-Dune-Api-Key: YOUR_API_KEY" \
    -d '{"sql": "SELECT * FROM dex.trades LIMIT 10", "performance": "medium"}' \
    | jq -r '.execution_id')

  # Step 2: Poll for completion
  while true; do
    STATE=$(curl -s "https://api.dune.com/api/v1/execution/$EXECUTION_ID/status" \
      -H "X-Dune-Api-Key: YOUR_API_KEY" \
      | jq -r '.state')

    echo "State: $STATE"
    [[ "$STATE" =~ (QUERY_STATE_COMPLETED|QUERY_STATE_FAILED|QUERY_STATE_CANCELLED) ]] && break
    sleep 2
  done

  # Step 3: Get results
  curl -s "https://api.dune.com/api/v1/execution/$EXECUTION_ID/results" \
    -H "X-Dune-Api-Key: YOUR_API_KEY" | jq
  ```
</RequestExample>

<ResponseExample>
  ```json theme={null}
  {
    "execution_id": "01HKZJ2683PHF9Q9PHHQ8FW4Q1",
    "state": "QUERY_STATE_PENDING"
  }
  ```
</ResponseExample>


## OpenAPI

````yaml POST /v1/sql/execute
openapi: 3.0.1
info:
  contact: {}
  description: Dune API
  title: DuneAPI
  version: '1.0'
servers:
  - url: https://api.dune.com/api
security: []
paths:
  /v1/sql/execute:
    post:
      summary: Execute raw SQL query
      description: Execute raw SQL query without requiring a stored query ID
      parameters:
        - description: API Key for the service
          in: header
          name: X-Dune-Api-Key
          required: true
          schema:
            type: string
        - description: Alternative to using the X-Dune-Api-Key header
          in: query
          name: api_key
          schema:
            type: string
      requestBody:
        content:
          '*/*':
            schema:
              $ref: '#/components/schemas/models.ExecuteSQLRequest'
        description: ExecuteSQLRequest
        required: true
        x-originalParamName: body
      responses:
        '200':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.ExecuteQueryResponse'
          description: OK
        '400':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error400'
          description: Bad Request
        '401':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error401'
          description: Unauthorized
        '402':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error402'
          description: Payment Required
        '403':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error403'
          description: Forbidden
        '404':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error404'
          description: Not Found
        '500':
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/models.Error500'
          description: Internal Server Error
components:
  schemas:
    models.ExecuteSQLRequest:
      properties:
        performance:
          description: The performance engine tier the execution will be run on
          enum:
            - small
            - medium
            - large
          type: string
        sql:
          description: The SQL query to execute
          type: string
      required:
        - sql
      type: object
    models.ExecuteQueryResponse:
      properties:
        execution_id:
          example: 01HKZJ2683PHF9Q9PHHQ8FW4Q1
          type: string
        state:
          example: QUERY_STATE_PENDING
          type: string
      required:
        - execution_id
        - state
      type: object
    models.Error400:
      properties:
        error:
          example: Bad Request
          type: string
      type: object
    models.Error401:
      properties:
        error:
          example: Invalid API Key
          type: string
      type: object
    models.Error402:
      properties:
        error:
          example: >-
            This API request would exceed your configured limits per billing
            cycle.
          type: string
      type: object
    models.Error403:
      properties:
        error:
          example: >-
            Not allowed to execute query. Query is archived, unsaved or not
            enough permissions
          type: string
      type: object
    models.Error404:
      properties:
        error:
          example: Object not found
          type: string
      type: object
    models.Error500:
      properties:
        error:
          example: Internal error
          type: string
      type: object

````