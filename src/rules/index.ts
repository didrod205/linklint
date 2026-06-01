/** Registry of per-document rules, in report order. */

import type { DocRule } from "./context.js";
import { brokenAnchor, brokenCrossAnchor, brokenFileLink, brokenImage } from "./links.js";
import {
  absolutePathLink,
  ambiguousAnchor,
  emptyLink,
  externalLink,
  mailtoFormat,
  undefinedReference,
} from "./hygiene.js";

export const DOC_RULES: DocRule[] = [
  brokenFileLink,
  brokenImage,
  brokenAnchor,
  brokenCrossAnchor,
  undefinedReference,
  emptyLink,
  mailtoFormat,
  absolutePathLink,
  ambiguousAnchor,
  externalLink,
];

export type { DocRule, RuleContext } from "./context.js";
