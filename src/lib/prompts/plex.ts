import prompts from "prompts";
import { requiredPrompts } from "./helpers";

/**
 * Prompts user if they want to automatically refresh plex libraries.
 * @param {boolean} initial Default value
 * @returns {Promise<boolean>} True or False
 */
export const usePlex = async (initial: boolean): Promise<boolean> => (await prompts({
	type: "toggle",
	name: "usePlex",
	message: "Do you want to automatically refresh plex libraries?",
	initial,
	active: "Yes",
	inactive: "No"
})).usePlex||initial;

import type { Section } from "@ctrl/plex";
/**
 * Prompts user to select plex sections to refresh
 * @param selectedSections Sections already selected
 * @param avalibleSections Array of avalible plex sections
 * @returns {Promise<Array<string>>} UUID's of selected plex sections
 */
export const sections = async (selectedSections: string[], avalibleSections: Section[]): Promise<Array<string>> => (await prompts({
	type: "multiselect",
	name: "sections",
	message: "Please select the plex section's you want to refresh.",
	choices: Object.values(avalibleSections).map(avalibleSection => ({ title: `[${avalibleSection.server.friendlyName}]: ${avalibleSection.title}`, value: avalibleSection.uuid, selected: selectedSections.includes(avalibleSection.uuid) })),
	hint: "- Space to select. Return to submit"
})).sections||selectedSections;

/**
 * Prompts user for their plex username.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
export const username = async (): Promise<string> => (await requiredPrompts({
	type: "text",
	name: "username",
	message: "Plex account email/username:",
})).username;

/**
 * Prompts user for their plex password.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
export const password = async (): Promise<string> => (await requiredPrompts({
	type: "password",
	name: "password",
	message: "Plex account password:",
})).password;

/**
 * Prompts user for their plex server hosname.
 * @param {string} initial
 * @returns {Promise<string>}
 */
export const hostname = async (initial: string): Promise<string> => (await prompts({
	type: "text",
	name: "hostname",
	message: "Plex server IP/Hostname:",
	initial
})).hostname||initial;

/**
 * Prompts user for their plex server port.
 * @param {number} initial 
 * @returns {Promise<number>}
 */
export const port = async (initial: number): Promise<number> => (await prompts({
	type: "text",
	name: "port",
	message: "Plex server port:",
	initial
})).port||initial;