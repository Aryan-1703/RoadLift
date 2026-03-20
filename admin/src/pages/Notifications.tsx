import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Send, CheckCircle } from 'lucide-react';
import { broadcastNotification } from '../lib/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input, { Select } from '../components/ui/Input';

export default function Notifications() {
  const [title,    setTitle]    = useState('');
  const [body,     setBody]     = useState('');
  const [audience, setAudience] = useState('drivers');
  const [sent,     setSent]     = useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: () => broadcastNotification({ title, body, audience }),
    onSuccess: (res) => {
      setSent(res.data.sent);
      setTitle('');
      setBody('');
    },
  });

  const handleSend = () => {
    if (!title.trim() || !body.trim()) return;
    if (!confirm(`Send notification to all ${audience}?`)) return;
    setSent(null);
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl space-y-4">
      <Card title="Broadcast Notification">
        <div className="p-5 space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-amber-300 font-medium">Heads up</p>
            <p className="text-xs text-amber-400/80 mt-1">
              This sends a push notification to every active user in the selected audience. Use sparingly.
            </p>
          </div>

          <Select
            label="Audience"
            value={audience}
            onChange={e => setAudience(e.target.value)}
          >
            <option value="drivers">All Drivers</option>
            <option value="customers">All Customers</option>
            <option value="all">Everyone (Drivers + Customers)</option>
          </Select>

          <Input
            label="Title"
            placeholder="e.g. Maintenance Update"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={80}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-400">Message</label>
            <textarea
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors resize-none"
              placeholder="Write your message here..."
              rows={4}
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={300}
            />
            <p className="text-xs text-slate-500 text-right">{body.length}/300</p>
          </div>

          {mutation.isError && (
            <p className="text-sm text-red-400">Failed to send. Please try again.</p>
          )}

          {sent !== null && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <CheckCircle size={16} />
              Notification sent to {sent} user{sent !== 1 ? 's' : ''}.
            </div>
          )}

          <Button
            onClick={handleSend}
            loading={mutation.isPending}
            disabled={!title.trim() || !body.trim()}
            icon={<Send size={15} />}
            className="w-full"
            size="lg"
          >
            Send Notification
          </Button>
        </div>
      </Card>

      {/* Tips */}
      <Card title="Tips">
        <div className="p-5 space-y-2">
          {[
            'Keep titles under 50 characters for best display on all devices.',
            'Messages over 150 characters may be truncated on some devices.',
            'Only active (non-suspended) users with push tokens will receive notifications.',
            'Online drivers will also receive a real-time in-app alert.',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-400">
              <span className="text-slate-600 flex-shrink-0 mt-0.5">•</span>
              {tip}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
