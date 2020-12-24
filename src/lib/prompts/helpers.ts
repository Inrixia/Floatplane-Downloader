import prompts from "prompts";

/**
 * Prompts a user for input, onCancel tries again `maxDepth` times.
 * @param question Question to ask
 * @param maxDepth Maximum times to ask the question 
 * @param cancelPrompt String to sent to stdout when user cancels (omitted on last cancel).
 */
export const requiredPrompts = (question: prompts.PromptObject, maxDepth=2, cancelPrompt="\nAnswering this question is required to continue.\n", depth=0): Promise<prompts.Answers<string>> => {
	if (depth > 0 && depth < maxDepth) process.stdout.write(cancelPrompt);
	if (depth >= maxDepth) process.exit(1);
	const onCancel = () => new Promise(res => res(requiredPrompts(question, maxDepth, cancelPrompt, depth+=1)));
	return prompts(question, { onCancel });
};