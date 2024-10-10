# Get manga details with manga_id on manga.env file
GET https://api.mangadex.org/statistics/manga/{{manga_id}}

HTTP 200
[Asserts]
jsonpath "$.result" == "ok"
header "server" contains "MangaDex"