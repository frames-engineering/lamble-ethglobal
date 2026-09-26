"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Placeholder onboarding prompt; replace with the real one once the agent flow exists. */
const AGENT_PROMPT = `You are my token launch agent, working with LAMBLE.

LAMBLE is a meta launchpad. It compares launchpads such as pump.fun, Bags, BONK.fun, clanker and four.meme on fees, launches, graduation rates and momentum, then routes each launch to the venue where the token has the best odds of success.

When I describe a token I want to launch:
1. Ask for anything missing: name, ticker, narrative, chain and budget.
2. Recommend the launchpad with the best odds and explain why in two or three sentences.
3. Draft the launch details and wait for my confirmation before anything is deployed.

Start by asking what token I want to launch.`;

async function copyPrompt(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(AGENT_PROMPT);
    return true;
  } catch {
    return false;
  }
}

/** Copies the agent prompt, then confirms in a dialog (bottom drawer on phones). */
export function OnboardAgentButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const onboard = async () => {
    setCopied(await copyPrompt());
    setOpen(true);
  };

  return (
    <>
      <Button type="button" variant="secondary" size="lg" onClick={onboard}>
        Onboard Agent
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <div className="flex flex-col gap-1 pr-10">
            <DialogTitle>{copied ? "Prompt copied" : "Copy the prompt"}</DialogTitle>
            <DialogDescription>Paste it in any client.</DialogDescription>
          </div>
          <pre className="max-h-48 overflow-y-auto rounded-xl bg-surface-2 p-3 font-sans text-xs leading-relaxed whitespace-pre-wrap text-med">
            {AGENT_PROMPT}
          </pre>
          {!copied && (
            <Button type="button" onClick={async () => setCopied(await copyPrompt())} className="self-end">
              Copy prompt
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
