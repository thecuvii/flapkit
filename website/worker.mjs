export default {
  fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname === 'flapkit.cuvii.dev') {
      url.hostname = 'cuvii.dev'
      url.protocol = 'https:'
      url.pathname = `/flapkit${url.pathname}`
      return Response.redirect(url.href, 301)
    }
    return env.ASSETS.fetch(request)
  },
}
