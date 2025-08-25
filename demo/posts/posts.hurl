GET {{api_base}}/posts/{{post_id}}
Accept: application/json

HTTP 200
[Asserts]
jsonpath "$.id" == {{post_id}}
jsonpath "$.title" isString