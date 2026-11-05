---
name: interactive-design-tradeoffs
description: 'Use when the user wants collaborative design discovery with multiple iterations, explicit alternatives, tradeoffs, and explanations before committing to implementation. Triggers: interactive design, compare options, explain tradeoffs, what is at stake, decision support, iterate on choices.'
argument-hint: 'Topic, constraints, and decision scope (for example: auth provider for mobile app)'
user-invocable: true
---

# Interactive Design Tradeoffs

Use this skill to run a guided decision workshop inside chat. The objective is informed decisions, not fast answers.

## Outcomes
- Present clear options with realistic tradeoffs.
- Let the user request deeper explanation, alternatives, or scenario analysis.
- Iterate until confidence is high enough to decide.
- Produce a decision record with risks and revisit triggers.

## Interaction Contract
- Ask one focused question at a time.
- Always include an explanation path: user can ask why.
- Always include alternatives path: user can ask what else.
- Always include tradeoff path: user can ask what is gained and lost.
- Never force a decision in the first iteration unless user explicitly asks.

## Procedure
1. Frame the decision
- Confirm decision scope, constraints, and timeline.
- Ask what matters most: speed, cost, flexibility, reliability, privacy, developer effort.

2. Present an option set
- Provide 2-4 viable options.
- Include one recommended option and at least one strong alternative.
- Use the comparison table in [option matrix](./references/option-matrix.md).

3. Ask a control question
- Offer explicit next moves:
  - explain one option in plain terms
  - generate more alternatives
  - run what-if scenario
  - recommend with rationale
  - postpone and gather data

4. Iterate
- In each round, refine options or assumptions.
- Surface second-order effects: lock-in risk, migration cost, team skills, operational burden.
- Keep unresolved items explicit.

5. Converge
- Ask for a confidence score from 1-5.
- If score < 4, run another iteration.
- If score >= 4, finalize decision brief.

6. Commit decision brief
- Chosen option.
- Why it was selected now.
- Rejected alternatives and reasons.
- Known risks and mitigation.
- Revisit triggers and date.

## Tradeoff Dimensions Checklist
- Build speed vs long-term flexibility.
- Simplicity vs feature completeness.
- Upfront cost vs operating cost.
- Vendor convenience vs lock-in risk.
- Offline reliability vs sync complexity.
- User privacy vs personalization.

## Default Question Bank
Use the prompts in [question bank](./references/question-bank.md) to keep the discussion exploratory and concrete.
