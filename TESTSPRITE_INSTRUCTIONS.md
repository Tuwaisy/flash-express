TestSprite smoke test instructions

1. Ensure the server is running locally (from repo root run: npm run start).

2. TestSprite will run a simple HTTP check against /api/health and assert status: OK.

3. Use the TestSprite CLI to run the test (may require API_KEY env var if using remote runner).

Example usage:
API_KEY=$TESTSPRITE_API_KEY npx @testsprite/testsprite-mcp@latest generateCodeAndExecute --script tests/health_check.testsprite.json

4. Expected result: test passes with HTTP 200 and JSON body containing { status: 'OK' }.
