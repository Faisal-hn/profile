import type { MDXRemoteProps } from "next-mdx-remote/rsc";
import type { ComponentPropsWithoutRef } from "react";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

export const mdxOptions: NonNullable<MDXRemoteProps["options"]> = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: {
            light: "github-light",
            dark: "github-dark",
          },
          keepBackground: false,
        },
      ],
    ],
  },
};

function MdxImage(props: ComponentPropsWithoutRef<"img">) {
  const { alt = "", className, ...rest } = props;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- blog markdown images from /public
    <img
      alt={alt}
      className={[
        "rounded-md border border-border my-6 max-w-full h-auto",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      loading="lazy"
      {...rest}
    />
  );
}

function MdxTable(props: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="my-6 overflow-x-auto">
      <table {...props} />
    </div>
  );
}

/** Custom elements for blog MDX (images, scrollable tables). */
export const mdxComponents: NonNullable<MDXRemoteProps["components"]> = {
  img: MdxImage,
  table: MdxTable,
};
