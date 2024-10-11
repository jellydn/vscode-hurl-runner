GET https://example.org/news
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:70.0) Gecko/20100101 Firefox/70.0
[QueryStringParams]
order: newest
search: {{custom-search}}
count: 100

POST https://example.org/contact
[FormParams]
default: false
token: {{token}}
email: john.doe@rookie.org
number: 33611223344

POST https://example.org/upload
# One can specify the file content type:
[MultipartFormData]
field1: value1
field2: file,example.txt;
field3: file,example.zip; application/zip

GET https://example.org/protected
[BasicAuth]
bob: secret