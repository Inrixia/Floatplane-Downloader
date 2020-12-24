import prompts from "prompts";

/**
 * Prompts a user for input, onCancel tries again `maxDepth` times.
 * @param {prompts.PromptObject} question Question to ask
 * @param {Number} maxDepth Maximum times to ask the question 
 * @param {string} cancelPrompt String to sent to stdout when user cancels (omitted on last cancel).
 */
export const requiredPrompts = (question: prompts.PromptObject, maxDepth: number=2, cancelPrompt: string="\nAnswering this question is required to continue.\n", depth=0) => {
	if (depth > 0 && depth < maxDepth) process.stdout.write(cancelPrompt);
	if (depth >= maxDepth) process.exit(1);
	const onCancel = () => new Promise(async res => res(await requiredPrompts(question, maxDepth, cancelPrompt, depth+=1)));
	return prompts(question, { onCancel });
};