/** Shared rule context and helpers. */

import type { Project } from "../project.js";
import type { DocModel, Issue, LinklintConfig, RuleId, Severity } from "../types.js";

export interface RuleContext {
  doc: DocModel;
  project: Project;
  config: LinklintConfig;
}

export interface DocRule {
  id: RuleId;
  severity: Severity;
  run(ctx: RuleContext): Issue[];
}

export function severityOf(rule: DocRule, config: LinklintConfig): Severity {
  return config.ruleSeverity[rule.id] ?? rule.severity;
}

export interface IssueFields {
  line?: number;
  target: string;
  text?: string;
  message: string;
  detail?: string;
  fix?: string;
}

export function makeIssue(rule: DocRule, ctx: RuleContext, fields: IssueFields): Issue {
  const issue: Issue = {
    rule: rule.id,
    severity: severityOf(rule, ctx.config),
    document: ctx.doc.path,
    target: fields.target,
    message: fields.message,
  };
  if (fields.line !== undefined) issue.line = fields.line;
  if (fields.text !== undefined && fields.text !== "") issue.text = fields.text;
  if (fields.detail !== undefined) issue.detail = fields.detail;
  if (fields.fix !== undefined) issue.fix = fields.fix;
  return issue;
}

export function isIgnored(target: string, config: LinklintConfig): boolean {
  return config.ignoreTargets.some((pat) => target.includes(pat));
}
