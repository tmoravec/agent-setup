import { Plugin } from "@opencode/plugin"

type BraveSearchResponse = {
  web?: {
    results?: Array<{
      title?: string
      url: string
      description?: string
    }>
  }
}

export default Plugin.define({
  id: "brave-websearch",
  async setup(ctx) {
    await ctx.websearch.transform((editor) => {
      editor.add({
        id: "brave",
        name: "Brave Search",
        execute: async ({ query }, { signal }) => {
          const apiKey = process.env.BRAVE_API_KEY
          if (!apiKey) throw new Error("BRAVE_API_KEY is not set")

          const url = new URL("https://api.search.brave.com/res/v1/web/search")
          url.searchParams.set("q", query)
          url.searchParams.set("count", "8")

          const response = await fetch(url, {
            signal,
            headers: {
              Accept: "application/json",
              "X-Subscription-Token": apiKey,
            },
          })
          if (!response.ok) throw new Error(`Brave Search returned HTTP ${response.status}`)

          const data = (await response.json()) as BraveSearchResponse
          return (data.web?.results ?? []).map((result) => ({
            url: result.url,
            title: result.title,
            content: result.description,
            time: {},
          }))
        },
      })
    })
  },
})
