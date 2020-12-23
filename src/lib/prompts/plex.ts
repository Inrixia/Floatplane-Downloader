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
})).usePlex;

/**
 * Prompts user for the plex sections they want to automatically refresh
 * @param {string} initial Default values (10, 11, 12)
 * @returns {Promise<Array<string>>} Sections to refresh
 */
export const sections = async (initial: string): Promise<Array<string>> => (await requiredPrompts({
	type: "list",
	name: "sections",
	message: "Please enter the plex section id's you want to refresh.",
	initial
})).sections;

/**
 * Prompts user for their plex username.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
export const username = async (initial: string): Promise<string> => (await prompts({
	type: "text",
	name: "username",
	message: "Plex account email/username:",
	initial
})).username;

/**
 * Prompts user for their plex password.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
export const password = async (initial: string): Promise<string> => (await prompts({
	type: "password",
	name: "password",
	message: "Plex account password:",
	initial
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
})).hostname;

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
})).port;