import prompts from "prompts";

/**
 * Prompts a user for input, onCancel tries again `maxDepth` times.
 * @param prompt Prompt
 * @param maxDepth Maximum times to prompt
 * @param cancelPrompt String to sent to stdout when user cancels (omitted on last cancel).
 */
export const requiredPrompts = (
	prompt: prompts.PromptObject,
	maxDepth = 2,
	cancelPrompt = "\nAnswering this prompt is required to continue.\n",
	depth = 0,
): Promise<prompts.Answers<string>> =>
	new Promise((res) => {
		if (depth > 0 && depth < maxDepth) process.stdout.write(cancelPrompt);
		if (depth >= maxDepth) {
			console.log(`\nRequired prompt cancelled ${maxDepth} times! Exiting...`);
			process.exit(1);
		}
		prompts(prompt, { onCancel: () => res(requiredPrompts(prompt, maxDepth, cancelPrompt, (depth += 1))) }).then(res);
	});
