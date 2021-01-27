const mockConnector = require('..');
// This is to allow the VendorConnector.js to load @fusebit/asana-connector:
const connector = mockConnector;
jest.mock('@fusebit/asana-connector', () => mockConnector, { virtual: true });

// Specializations for this connector
const createFunctionName = 'createAsanaConnector';
const connectorClassName = 'AsanaConnector';
const vendorConnectorClassName = 'VendorAsanaConnector';
const { VendorAsanaConnector } = require('../lib/manager/template/' + vendorConnectorClassName);
const VendorConnector = VendorAsanaConnector;

const {
  getCredentials,
  createCtx,
  cleanup,
  testBoundaryId,
  testFunctionId1,
  testFunctionId2,
  getStorage,
} = require('./common');
const Url = require('url');

const profile = getCredentials();

const vendorId = 'foobar';
const vendorUserId = 'u123';

const configureCtx = createCtx(
  {
    query: {
      returnTo: 'https://contoso.com',
      state: 'abc',
      data: Buffer.from(
        JSON.stringify({
          baseUrl: profile.baseUrl,
          accountId: profile.account,
          subscriptionId: profile.subscription,
          boundaryId: testBoundaryId,
          functionId: testFunctionId2,
          templateName: 'test-template-name',
          [`${vendorId}_oauth_user_id`]: vendorUserId,
          [`${vendorId}_oauth_connector_base_url`]: 'https://idontexist',
        })
      ).toString('base64'),
    },
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
  },
  {
    path: `/configure`,
  }
);

const configureWithSettingsManagerCtx = {
  ...configureCtx,
  configuration: {
    ...configureCtx.configuration,
    fusebit_settings_managers: 'https://settings.manager.com',
  },
};

const callbackCtx = (state) =>
  createCtx(
    {
      query: {
        code: 'abc',
        state,
      },
      configuration: {
        vendor_oauth_authorization_url: 'https://idp.com/authorize',
        vendor_oauth_token_url: 'https://idp.com/token',
        vendor_oauth_scope: 'sample-scope',
        vendor_oauth_audience: 'sample-audience',
        vendor_oauth_client_id: '123',
        vendor_oauth_client_secret: '456',
        vendor_oauth_extra_params: 'sample-extra-param=12',
        vendor_name: 'Contoso',
        vendor_prefix: 'contoso',
        fusebit_allowed_return_to: '*',
      },
    },
    {
      path: `/callback`,
    }
  );

const getTokenCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/user/789/token`,
  }
);

const getForeignTokenCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/foreign-user/${vendorId}/${vendorUserId}/token`,
  }
);

const deleteCtx = createCtx(
  {
    method: 'DELETE',
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/`,
  }
);

const getHealthCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/user/789/health`,
  }
);

const getForeignHealthCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/foreign-user/${vendorId}/${vendorUserId}/health`,
  }
);

const getUserCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/user/789`,
  }
);

const getForeignUserCtx = createCtx(
  {
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/foreign-user/${vendorId}/${vendorUserId}`,
  }
);

const postNotificationCtx = createCtx(
  {
    method: 'POST',
    body: {
      text: 'hello, world',
    },
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/notification/789`,
  }
);

const deleteUserCtx = createCtx(
  {
    method: 'DELETE',
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/user/789`,
  }
);

const deleteForeignUserCtx = createCtx(
  {
    method: 'DELETE',
    configuration: {
      vendor_oauth_authorization_url: 'https://idp.com/authorize',
      vendor_oauth_token_url: 'https://idp.com/token',
      vendor_oauth_scope: 'sample-scope',
      vendor_oauth_audience: 'sample-audience',
      vendor_oauth_client_id: '123',
      vendor_oauth_client_secret: '456',
      vendor_oauth_extra_params: 'sample-extra-param=12',
      vendor_name: 'Contoso',
      vendor_prefix: 'contoso',
      fusebit_allowed_return_to: '*',
    },
    caller: {
      permissions: {
        allow: [
          {
            action: '*',
            resource: '/',
          },
        ],
      },
    },
  },
  {
    path: `/foreign-user/${vendorId}/${vendorUserId}`,
  }
);

describe('connector', () => {
  beforeAll(async () => cleanup());
  afterEach(async () => cleanup());

  test('Connector module has correct exports', async () => {
    expect(typeof connector[createFunctionName]).toBe('function');
    expect(typeof connector[connectorClassName]).toBe('function');
  });

  test('createOAuthConnector returns an async function for base OAuthConnector', async () => {
    const handler = connector[createFunctionName](new connector[connectorClassName]());
    expect(typeof handler).toBe('function');
    expect(handler.constructor.name).toBe('AsyncFunction');
  });

  test('createOAuthConnector returns an async function for derived VendorConnector', async () => {
    const handler = connector[createFunctionName](new VendorConnector());
    expect(typeof handler).toBe('function');
    expect(handler.constructor.name).toBe('AsyncFunction');
  });

  test('The /configure endpoint returns HTML by default', async () => {
    const handler = connector[createFunctionName](new VendorConnector());
    const ctx = configureCtx;
    const response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    expect(response.headers['content-type']).toMatch('text/html');
    expect(response.bodyEncoding).toBe('utf8');
  });

  test('The /configure endpoint returns a redirect when no initial HTML is specified', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
    }
    const handler = connector[createFunctionName](new TestOAuthConnector());
    const ctx = configureCtx;
    const response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    const url = Url.parse(response.headers.location, true);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('idp.com');
    expect(url.pathname).toBe('/authorize');
    expect(url.query.client_id).toBe('123');
    expect(url.query.response_type).toBe('code');
    expect(url.query.scope).toBe('sample-scope');
    expect(url.query.audience).toBe('sample-audience');
    expect(url.query['sample-extra-param']).toBe('12');
    expect(url.query.state).toBeDefined();
    expect(url.query.redirect_uri).toBe(
      `${profile.baseUrl}/v1/run/${profile.subscription}/${testBoundaryId}/${testFunctionId1}/callback`
    );
  });

  test('The /configure endpoint returns a redirect when custom settings manager is specified', async () => {
    const handler = connector[createFunctionName](new VendorConnector());
    const ctx = configureWithSettingsManagerCtx;
    const response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    const url = Url.parse(response.headers.location, true);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('settings.manager.com');
    expect(url.pathname).toBe('/');
    expect(url.query.returnTo).toBe(`${configureWithSettingsManagerCtx.baseUrl}/configure`);
    expect(JSON.parse(Buffer.from(url.query.state, 'base64').toString())).toMatchObject({
      configurationState: 'settingsManagers',
      returnTo: 'https://contoso.com',
      returnToState: 'abc',
      settingsManagersStage: 1,
    });
    expect(url.query.data).toBe(configureWithSettingsManagerCtx.query.data);
  });

  test('The /callback endpoint logs in vendor user and returns a redirect with successful response', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
      async onConfigurationComplete(ctx, userContext, data) {
        await super.onConfigurationComplete(ctx, userContext, data);
        userContext.foo = 'bar';
        userContext.dataPassedToBindUser = data;
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    // Process the /callback and pass the 'state' parameter from the response to /configure
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Validate the redirect URL query params
    expect(typeof response.headers.location).toBe('string');
    url = Url.parse(response.headers.location, true);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('contoso.com');
    expect(url.pathname).toBe('/');
    expect(url.query.status).toBe('success');
    expect(url.query.state).toBe('abc');
    expect(url.query.data).toBeDefined();
    // Validate the 'data' that would normally be passed back to the add-on handler on installation:
    const data = JSON.parse(Buffer.from(url.query.data, 'base64'));
    expect(data).toMatchObject({
      contoso_oauth_user_id: '789',
      contoso_oauth_connector_base_url: `${profile.baseUrl}/v1/run/${profile.subscription}/${testBoundaryId}/${testFunctionId1}`,
    });
    // Validate storage content for the logged in user
    response = await getStorage(
      testBoundaryId,
      testFunctionId1,
      oAuthConnector._getStorageIdForVendorUser(data.contoso_oauth_user_id)
    );
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.status).toBe('authenticated');
    expect(response.body.data.timestamp).toBeDefined();
    expect(response.body.data.vendorToken).toBeDefined();
    expect(response.body.data.vendorToken.access_token).toBe('access-token:abc');
    expect(response.body.data.vendorToken.expires_in).toBe(10000);
    expect(response.body.data.vendorToken.expires_at).toBeDefined();
    expect(response.body.data.vendorUserId).toBe(data.contoso_oauth_user_id);
    expect(response.body.data.vendorUserProfile).toBeDefined();
    expect(response.body.data.foreignOAuthIdentities).toBeDefined();
    expect(response.body.data.foreignOAuthIdentities.foobar).toBeDefined();
    expect(response.body.data.foreignOAuthIdentities.foobar.userId).toBe(vendorUserId);
    expect(response.body.data.foreignOAuthIdentities.foobar.connectorBaseUrl).toBe('https://idontexist');
    expect(response.body.data.foo).toBe('bar');
    expect(response.body.data.dataPassedToBindUser).toMatchObject(
      JSON.parse(Buffer.from(configureCtx.query.data, 'base64').toString())
    );
    // Validate getUser works for the connector user
    const user = await oAuthConnector.getUser(configureCtx, data.contoso_oauth_user_id);
    expect(user).toMatchObject(response.body.data);
    // Validate stoage content for the foreign keys
    response = await getStorage(
      testBoundaryId,
      testFunctionId1,
      oAuthConnector._getStorageIdForVendorUser(vendorUserId, vendorId)
    );
    expect(response.status).toBe(200);
    expect(response.body).toBeDefined();
    expect(response.body.data).toBeDefined();
    expect(response.body.data.vendorUserId).toBe(data.contoso_oauth_user_id);
    // Validate getUser works for the foreign user
    const user1 = await oAuthConnector.getUser(configureCtx, vendorUserId, vendorId);
    expect(user1).toMatchObject(user);
    // Validate ensureAccessToken works for the connector user
    response = await oAuthConnector.ensureAccessToken(configureCtx, user);
    expect(response).toBeDefined();
    expect(response.access_token).toBe('access-token:abc');
    expect(response.expires_in).toBe(10000);
    expect(response.expires_at).toBeDefined();
    // Validate ensureAccessToken throws for foreign user
    try {
      await oAuthConnector.ensureAccessToken(configureCtx, user, vendorId);
      throw new Error('Passed');
    } catch (e) {
      expect(e.message).toMatch(/ENOTFOUND idontexist/);
    }
    // Validate delete user cleans storage
    await oAuthConnector.deleteUser(configureCtx, data.contoso_oauth_user_id);
    response = await getStorage(
      testBoundaryId,
      testFunctionId1,
      oAuthConnector._getStorageIdForVendorUser(data.contoso_oauth_user_id)
    );
    expect(response.status).toBe(404);
    response = await getStorage(
      testBoundaryId,
      testFunctionId1,
      oAuthConnector._getStorageIdForVendorUser(vendorUserId, vendorId)
    );
    expect(response.status).toBe(404);
  });

  test('The /callback endpoint returns error when onNewUser throws', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
      async onNewUser(ctx, userContext) {
        throw new Error('A completely unexpected error');
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    // Process the /callback and pass the 'state' parameter from the response to /configure
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Validate the redirect URL query params
    expect(typeof response.headers.location).toBe('string');
    url = Url.parse(response.headers.location, true);
    expect(url.protocol).toBe('https:');
    expect(url.host).toBe('contoso.com');
    expect(url.pathname).toBe('/');
    expect(url.query.status).toBe('error');
    expect(url.query.state).toBe('abc');
    expect(url.query.data).toBeDefined();
    // Validate the 'data' that would normally be passed back to the add-on handler on installation:
    const data = JSON.parse(Buffer.from(url.query.data, 'base64'));
    expect(data).toMatchObject({
      message: 'Error initializing new user: A completely unexpected error',
      status: 500,
    });
    // Validate storage content for the logged in user does not exist
    response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
    expect(response.status).toBe(404);
    // Validate stoage content for the foreign keys does not exist
    response = await getStorage(
      testBoundaryId,
      testFunctionId1,
      oAuthConnector._getStorageIdForVendorUser(vendorUserId, vendorId)
    );
    expect(response.status).toBe(404);
  });

  test('The /user/:vendorUserId/token and /foreign-user/:vendorId/:vendorUserId/token endpoints return access token', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Get the current access token for the logged in user
    ctx = getTokenCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    let body = JSON.parse(response.body);
    expect(body.access_token).toBe('access-token:abc');
    expect(body.expires_in).toBe(10000);
    expect(body.expires_at).toBeDefined();
    // Get the current access token for the logged in user using foreign user id
    ctx = getForeignTokenCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    body = JSON.parse(response.body);
    expect(body.access_token).toBe('access-token:abc');
    expect(body.expires_in).toBe(10000);
    expect(body.expires_at).toBeDefined();
  });

  test('The /user/:vendorUserId/health and /foreign-user/:vendorId/:vendorUserId/health endpoints return user health', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Get the current access token for the logged in user
    ctx = getHealthCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
    // Get the current access token for the logged in user using foreign user id
    ctx = getForeignHealthCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(response.body).toBe('');
  }, 20000);

  test('The GET /user/:vendorUserId endpoint returns user data', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Get the user
    ctx = getUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    let body = JSON.parse(response.body);
    expect(body.status).toBe('authenticated');
    expect(body.vendorUserId).toBe('789');
    expect(body.vendorUserProfile).toMatchObject({ id: '789' });
    expect(body.timestamp).toBeDefined();
    expect(body.vendorToken).toBeDefined();
    expect(body.vendorToken.access_token).toBe('access-token:abc');
    expect(body.vendorToken.expires_in).toBe(10000);
    expect(body.vendorToken.expires_at).toBeDefined();
  });

  test('The GET /foreign-user/:vendorId/:vendorUserId endpoint returns user data', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Get the user
    ctx = getForeignUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    const body = JSON.parse(response.body);
    expect(body.status).toBe('authenticated');
    expect(body.vendorUserId).toBe('789');
    expect(body.vendorUserProfile).toMatchObject({ id: '789' });
    expect(body.timestamp).toBeDefined();
    expect(body.vendorToken).toBeDefined();
    expect(body.vendorToken.access_token).toBe('access-token:abc');
    expect(body.vendorToken.expires_in).toBe(10000);
    expect(body.vendorToken.expires_at).toBeDefined();
  });

  test('The DELETE /user/:vendorUserId and /foreign-user/:vendorId/:vendorUserId endpoints delete the user', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();

    // Create user and validate is is deleted
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Delete the user
    ctx = deleteUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(204);
    // Validate storage content for the deleted user is deleted
    response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
    expect(response.status).toBe(404);
    // Validate the GET user returns 404
    ctx = getUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(404);

    // Create user and validate is is deleted using foreign ID
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Delete the user
    ctx = deleteForeignUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(204);
    // Validate storage content for the deleted user is deleted
    response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
    expect(response.status).toBe(404);
    // Validate the GET user returns 404
    ctx = getUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(404);
  }, 20000);

  test('The DELETE / deletes the storage', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();

    // Create user and validate is is deleted
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Delete connector
    ctx = deleteCtx;
    response = await handler(ctx);
    expect(response.status).toBe(204);
    // Validate storage content for the deleted user is deleted
    response = await getStorage(testBoundaryId, testFunctionId1, oAuthConnector._getStorageIdForVendorUser('789'));
    expect(response.status).toBe(404);
    // Validate the GET user returns 404
    ctx = getUserCtx;
    response = await handler(ctx);
    expect(response.status).toBe(404);
  });

  test('The custom POST /notification/:vendorUserId endpoint succeeds', async () => {
    class TestOAuthConnector extends VendorConnector {
      async getAuthorizationPageHtml(fusebitContext, authorizationUrl) {
        return undefined;
      }
      async getAccessToken(fusebitContext, authorizationCode, redirectUri) {
        return {
          access_token: `access-token:${authorizationCode}`,
          expires_in: 10000,
        };
      }
      async getUserProfile(tokenContext) {
        return { id: '789' };
      }
      onCreate(app) {
        app.post(
          '/notification/:vendorUserId',
          this.authorize({
            action: 'function:execute',
            resourceFactory: (req) =>
              `/account/${req.fusebit.accountId}/subscription/${req.fusebit.subscriptionId}/boundary/${
                req.fusebit.boundaryId
              }/function/${req.fusebit.functionId}/notification/${encodeURIComponent(req.params.vendorUserId)}/`,
          }),
          async (req, res, next) => {
            // Check if the user with the specifed ID has previously authenticated
            const userContext = await this.getUser(req.fusebit, req.params.vendorUserId);
            if (!userContext) {
              res.status(404);
              res.end();
            } else {
              // Ensure the access token for the user is current
              const tokenContext = await this.ensureAccessToken(req.fusebit, userContext);
              res.status(200);
              res.json({
                userId: req.params.vendorUserId,
                accessToken: tokenContext.access_token,
                payload: req.fusebit.body,
              });
            }
          }
        );
      }
    }
    const oAuthConnector = new TestOAuthConnector();
    const handler = connector[createFunctionName](new TestOAuthConnector());
    let ctx = configureCtx;
    // Initiate the authorization transaction only to extract the 'state' parameter to pass to /callback later
    let response = await handler(ctx);
    expect(response.status).toBe(302);
    expect(response.headers).toBeDefined();
    expect(typeof response.headers.location).toBe('string');
    let url = Url.parse(response.headers.location, true);
    expect(url.query.state).toBeDefined();
    ctx = callbackCtx(url.query.state);
    response = await handler(ctx);
    expect(response.status).toBe(302);
    // Post notification
    ctx = postNotificationCtx;
    response = await handler(ctx);
    expect(response.status).toBe(200);
    expect(typeof response.body).toBe('string');
    const body = JSON.parse(response.body);
    expect(body.userId).toBe('789');
    expect(body.accessToken).toBe('access-token:abc');
    expect(body.payload).toBeDefined();
    expect(body.payload.text).toBe('hello, world');
  });
});
