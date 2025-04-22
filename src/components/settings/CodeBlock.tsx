
import React from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Card } from '../ui/card';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  variant?: 'default' | 'destructive' | 'warning';
}

export function CodeBlock({ code, language = 'typescript', title, variant = 'default' }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="my-4 overflow-hidden">
      {title && (
        <div className="bg-muted px-4 py-2 font-mono text-sm font-semibold border-b">
          {title}
        </div>
      )}
      <div className="relative">
        <pre className="overflow-x-auto p-4 text-sm bg-muted/50 max-h-[600px]">
          <code className={`language-${language}`}>{code}</code>
        </pre>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 opacity-70 hover:opacity-100"
          onClick={copyToClipboard}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {variant !== 'default' && (
        <Alert variant={variant} className="mt-2 mx-4 mb-4">
          <AlertDescription>
            {variant === 'warning' 
              ? 'Make sure to adjust this code to match your specific requirements.'
              : 'Please follow the instructions carefully to avoid issues.'}
          </AlertDescription>
        </Alert>
      )}
    </Card>
  );
}

export function SQLBlock({ code, title }: { code: string; title?: string }) {
  return <CodeBlock code={code} language="sql" title={title} />;
}

export function TSBlock({ code, title, variant }: { code: string; title?: string; variant?: 'default' | 'destructive' | 'warning' }) {
  return <CodeBlock code={code} language="typescript" title={title} variant={variant} />;
}

export function ShellBlock({ code, title }: { code: string; title?: string }) {
  return <CodeBlock code={code} language="bash" title={title} />;
}
