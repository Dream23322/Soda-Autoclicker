## Contributing to the project

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes
4. Write tests for your code
5. Run the test suite
6. Submit a pull request

### Code Style

When contributing JavaScript code, please follow these formatting guidelines:

> Spacing
```js
// before closing {} have a blank line
function createPrompt(): null {
  // do something
  console.log("Hello");

}
createPrompt();
```
```js
// Group variables together like they are in a family
const promptPrefix: string = "Hello, how are you?"
const prompt: string = useTranslate ? "To English: " : userPrompt;
const promptSuffix: string = toolsEnabled ? toolsPrompt : "";

const model: string = getModel; // Separate because this doesn't have to do with the prompt
```
> Maintainability
```js
// Include variable types

	const query: string = (match[1] ?? "").trim().toLowerCase()
	if (!query) return ""

	const seen: Set<string> = new Set<string>()
	const results: string[] = []
```
