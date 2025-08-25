GET {{base_url}}/users
Accept: application/json

HTTP 200
[Asserts]
jsonpath "$.length" >= 1
jsonpath "$[0].name" isString