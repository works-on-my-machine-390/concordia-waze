package google

import "golang.org/x/oauth2"

func Config() (*oauth2.Config, error) {
	return oauthConfigFromEnv()
}
