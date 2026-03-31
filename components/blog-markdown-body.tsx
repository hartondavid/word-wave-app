import type { ComponentPropsWithoutRef } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

type AnchorProps = ComponentPropsWithoutRef<"a">
type ImgProps = ComponentPropsWithoutRef<"img">

function MarkdownImg({ alt, ...rest }: ImgProps) {
  return <img alt={alt ?? ""} {...rest} />
}

function MarkdownLink({ href, children, ...rest }: AnchorProps) {
  const external = href?.startsWith("http")
  return (
    <a href={href} {...rest} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  )
}

export function BlogMarkdownBody({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: MarkdownLink,
        img: MarkdownImg,
      }}
    >
      {markdown}
    </ReactMarkdown>
  )
}
