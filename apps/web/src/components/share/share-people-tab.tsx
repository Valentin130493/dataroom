'use client';

import { useState, type FormEvent } from 'react';
import { Mail, Trash2, UserRound } from 'lucide-react';
import { ShareRole, ShareType, emailSchema, type ShareSummary } from '@dataroom/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddRecipients, useCreateShare, useRemoveRecipient } from '@/hooks/use-shares';

interface SharePeopleTabProps {
  dataRoomId: string;
  nodeId: string | null;
  shares: ShareSummary[];
}

function parseEmails(raw: string): { emails: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\s,;]+/)
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);

  const emails: string[] = [];
  const invalid: string[] = [];

  parts.forEach((part) => {
    if (emailSchema.safeParse(part).success) {
      emails.push(part);
    } else {
      invalid.push(part);
    }
  });

  return { emails: [...new Set(emails)], invalid };
}

export function SharePeopleTab({ dataRoomId, nodeId, shares }: SharePeopleTabProps) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);

  const restricted = shares.find((share) => share.type === ShareType.RESTRICTED);
  const createShare = useCreateShare(dataRoomId, nodeId);
  const addRecipients = useAddRecipients(dataRoomId, nodeId);
  const removeRecipient = useRemoveRecipient(dataRoomId, nodeId);

  const isPending = createShare.isPending || addRecipients.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const { emails, invalid } = parseEmails(raw);

    if (invalid.length > 0) {
      setError(`Not a valid email: ${invalid.join(', ')}`);
      return;
    }

    if (emails.length === 0) {
      setError('Enter at least one email');
      return;
    }

    setError(null);

    const onDone = { onSuccess: () => setRaw('') };

    if (restricted) {
      addRecipients.mutate({ shareId: restricted.id, input: { emails } }, onDone);
      return;
    }

    createShare.mutate(
      {
        dataRoomId,
        nodeId,
        type: ShareType.RESTRICTED,
        role: ShareRole.VIEWER,
        emails,
        expiresAt: null,
      },
      onDone,
    );
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={raw}
            placeholder="name@company.com, another@company.com"
            aria-label="Emails to invite"
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setRaw(event.target.value);
              setError(null);
            }}
          />
          <Button type="submit" disabled={isPending || raw.trim().length === 0}>
            Invite
          </Button>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Invited people get read-only access, including everything nested inside.
          </p>
        )}
      </form>

      {restricted && restricted.recipients.length > 0 ? (
        <ul className="divide-y rounded-lg border">
          {restricted.recipients.map((recipient) => (
            <li key={recipient.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {recipient.userId ? (
                  <UserRound className="size-3.5" />
                ) : (
                  <Mail className="size-3.5" />
                )}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm">{recipient.email}</span>

              <Badge variant="secondary">Viewer</Badge>

              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={`Remove access for ${recipient.email}`}
                disabled={removeRecipient.isPending}
                onClick={() =>
                  removeRecipient.mutate({ shareId: restricted.id, recipientId: recipient.id })
                }
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
          No one has been invited yet.
        </p>
      )}
    </div>
  );
}
