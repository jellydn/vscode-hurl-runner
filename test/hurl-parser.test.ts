import { describe, expect, it } from "vitest";
import { parseHurlOutput } from "../src/hurl-parser";

describe("parseHurlOutput", () => {
	it("should parse a simple GET request", () => {
		const stderr = `
* Executing entry 1
* Request:
* GET https://example.com/api
* curl 'https://example.com/api'
> GET /api HTTP/1.1
> Host: example.com
> User-Agent: hurl/1.0
> Accept: */*
>
< HTTP/1.1 200 OK
< Content-Type: application/json
< Content-Length: 123
<
* Timings:
* namelookup: 1000 µs
* connect: 2000 µs
* total: 10000 µs
*
`;
		const stdout = '{"message": "Hello, World!"}';

		const result = parseHurlOutput(stderr, stdout);

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0]).toEqual({
			requestMethod: "GET",
			requestUrl: "/api",
			requestHeaders: {
				Host: "example.com",
				"User-Agent": "hurl/1.0",
				Accept: "*/*",
			},
			response: {
				status: "HTTP/1.1 200 OK",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": "123",
				},
				body: '{"message": "Hello, World!"}',
			},
			curlCommand: "curl 'https://example.com/api'",
			timings: {
				namelookup: "1.00 ms",
				connect: "2.00 ms",
				total: "10.00 ms",
			},
			captures: {},
		});
	});

	it("should handle empty input", () => {
		const result = parseHurlOutput("", "");
		expect(result.entries).toHaveLength(0);
	});

	it("should parse captures", () => {
		const stderr = `
* ------------------------------------------------------------------------------
* Executing entry 1
* Request:
* GET https://example.com/api
* Response:
< HTTP/1.1 200 OK
< Content-Type: application/json
* Response body:
{"id": "12345", "name": "Example"}
* Captures:
* id: 12345
* name: Example
* ------------------------------------------------------------------------------
`;
		const stdout = '{"id": "12345", "name": "Example"}';

		const result = parseHurlOutput(stderr, stdout);

		expect(result.entries).toHaveLength(1);
		expect(result.entries[0].captures).toEqual({
			id: "12345",
			name: "Example",
		});
	});
});
