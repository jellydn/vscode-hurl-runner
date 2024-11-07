# Basic PROPFIND request
PROPFIND http://localhost:8080/webdav/
Content-Type: text/xml; charset=utf-8

<?xml version="1.0" encoding="UTF-8" ?>
<D:propfind xmlns:D='DAV:'>
  <D:prop>
    <D:resourcetype />
  </D:prop>
</D:propfind>

# Create a collection
MKCOL http://localhost:8080/webdav/new-folder

# Copy a resource
COPY http://localhost:8080/webdav/file.txt
Destination: http://localhost:8080/webdav/new-folder/file.txt