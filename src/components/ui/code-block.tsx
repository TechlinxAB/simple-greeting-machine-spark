
import React from "react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: React.ReactNode;
  language?: string;
  className?: string;
}

export function CodeBlock({ 
  children, 
  language = "typescript", 
  className 
}: CodeBlockProps) {
  return (
    <div className={cn(
      "relative rounded-md bg-slate-950 p-4 overflow-x-auto text-sm text-slate-50 my-4",
      className
    )}>
      <pre className="font-mono">
        <code className={`language-${language}`}>
          {children}
        </code>
      </pre>
    </div>
  );
}

// Specialized code blocks for specific languages
export function TSBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="typescript" className={className}>
      {children}
    </CodeBlock>
  );
}

export function JSBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="javascript" className={className}>
      {children}
    </CodeBlock>
  );
}

export function SQLBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="sql" className={className}>
      {children}
    </CodeBlock>
  );
}

export function HTMLBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="html" className={className}>
      {children}
    </CodeBlock>
  );
}

export function CSSBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="css" className={className}>
      {children}
    </CodeBlock>
  );
}

export function ShellBlock({ 
  children, 
  className 
}: Omit<CodeBlockProps, "language">) {
  return (
    <CodeBlock language="shell" className={className}>
      {children}
    </CodeBlock>
  );
}
