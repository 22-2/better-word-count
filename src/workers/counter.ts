import { UNICODE_LETTER_REGEX } from "@/constants";

export const WORD_COUNT_WORKER_SRC =
	"\nlet pattern = /(?:[0-9]+(?:(?:,|\\.)[0-9]+)*|[\\-'’"
		.concat(UNICODE_LETTER_REGEX.source, "஀-௿가-힣ꥠ-ꥼힰ-ퟆ])+|[")
		.concat(
			/\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u4E00-\u9FD5\uAC00-\uD7A3\uA960-\uA97C\uD7B0-\uD7C6/
				.source,
			"]/g;\n",
			`function countWords(str) {
				pattern.lastIndex = 0;
				const m = str.match(pattern);
				return m ? m.length : 0;
			}

			self.onmessage = function(e) {
				try {
					self.postMessage(countWords(e.data));
				} catch (e) {
					console.error('BWC Worker Error', e);
				}
			};`,
		);
