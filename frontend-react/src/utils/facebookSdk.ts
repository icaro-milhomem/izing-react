const FB_SDK_ID = 'facebook-jssdk'

declare global {
  interface Window {
    FB?: {
      init: (params: { appId: string; cookie: boolean; xfbml: boolean; version: string }) => void
      login: (
        callback: (response: { authResponse?: { accessToken: string; userID: string }; status: string }) => void,
        options?: { scope?: string; return_scopes?: boolean }
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

export function loadFacebookSdk(appId: string): Promise<void> {
  if (!appId) {
    return Promise.reject(new Error('VITE_FACEBOOK_APP_ID não configurado'))
  }

  if (window.FB) return Promise.resolve()

  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v16.0'
      })
      resolve()
    }

    if (document.getElementById(FB_SDK_ID)) {
      const wait = setInterval(() => {
        if (window.FB) {
          clearInterval(wait)
          resolve()
        }
      }, 100)
      setTimeout(() => {
        clearInterval(wait)
        if (!window.FB) reject(new Error('Facebook SDK não carregou'))
      }, 10000)
      return
    }

    const script = document.createElement('script')
    script.id = FB_SDK_ID
    script.src = 'https://connect.facebook.net/pt_BR/sdk.js'
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('Falha ao carregar Facebook SDK'))
    document.body.appendChild(script)
  })
}

export function loginFacebookPages(): Promise<{ accessToken: string; userID: string }> {
  return new Promise((resolve, reject) => {
    if (!window.FB) {
      reject(new Error('Facebook SDK indisponível'))
      return
    }

    window.FB.login(
      response => {
        if (response.authResponse?.accessToken && response.authResponse.userID) {
          resolve({
            accessToken: response.authResponse.accessToken,
            userID: response.authResponse.userID
          })
          return
        }
        reject(new Error('Login Facebook cancelado ou sem permissão'))
      },
      {
        scope: 'pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement',
        return_scopes: true
      }
    )
  })
}
