import url from 'url';
import { setApi, getApi } from '@/setup/api';
import store from '@/store';

const loginTypeEnum = Object.freeze({
    LOGOUT: null,
    LOCAL_LOGIN: 1,
    OAUTH_LOGIN: 2,
    DOMAIN_NOT_FOUND: 3,
});

let isFirstLogin = null;
let LoginType = null;
let isNoApi = true;
let api = null;

const setDomainId = (domainId) => {
    sessionStorage.setItem('domainId', domainId);
};

const setAuthType = (domainOptions) => {
    store.commit('auth/setClientId', domainOptions.client_id);
    LoginType = domainOptions.auth_type;
};

const baseRedirectChecker = (domain) => {
    if (domain) {
        setDomainId(domain.domain_id);
        if (domain.plugin_info && domain.plugin_info.options && domain.plugin_info.options.auth_type) {
            setAuthType(domain.plugin_info.options);
            return loginTypeEnum.OAUTH_LOGIN;
        }
        return loginTypeEnum.LOCAL_LOGIN;
    }
    return loginTypeEnum.DOMAIN_NOT_FOUND;
};


const getDomain = async () => {
    try {
        const parsedObject = url.parse(window.location.href).host;
        const domain_name = parsedObject.split('.');
        const response = await api.post('/identity/domain/list', { name: domain_name[0] });
        if (response.data.total_count > 0) {
            const domainItems = response.data.results[0];
            isFirstLogin = baseRedirectChecker(domainItems);
            if (domainItems.tags.hasOwnProperty('description')) {
                store.commit('auth/setGreetDesc', domainItems.tags.description);
            }
        } else {
            isFirstLogin = loginTypeEnum.DOMAIN_NOT_FOUND;
        }
    } catch (error) {
        console.error('No valid Domain', error);
    }
};

const checkAccessToken = (to, from, next) => {
    if (sessionStorage.getItem('token')) {
        store.dispatch('auth/setUserId', { userId: sessionStorage.getItem('userId') });
        store.dispatch('auth/setToken', { token: sessionStorage.getItem('token') });
        next();
    } else {
        store.dispatch('auth/setNextPath', { nextPath: to.fullPath });
        next({
            path: '/sign-in',
        });
    }
};

const checkDomain = (to, from, next, meta) => {
    if (isFirstLogin === loginTypeEnum.LOCAL_LOGIN) {
        meta.requiresDomainCheck = false;
        next({
            path: '/sign-in',
        });
    } else if (isFirstLogin === loginTypeEnum.OAUTH_LOGIN) {
        if (LoginType === 'google_oauth2') {
            meta.requiresDomainCheck = false;
            next({
                path: '/google-sign-in',
            });
        } else {
            meta.requiresDomainCheck = false;
            next({
                path: '/error-page',
            });
        }
    } else if (isFirstLogin === loginTypeEnum.DOMAIN_NOT_FOUND) {
        meta.requiresDomainCheck = false;
        next({
            path: '/error-page',
        });
    }
};

export const beforeEach = async (to, from, next) => {
    if (isNoApi) {
        await setApi();
        api = getApi();
        isNoApi = false;
    }

    if (isFirstLogin === loginTypeEnum.LOGOUT) {
        await getDomain();
    }
    for (let i = to.matched.length - 1; i > -1; i--) {
        if (to.matched[i].meta.requiresAuth) {
            checkAccessToken(to, from, next);
            return;
        }

        if (to.matched[i].meta.requiresDomainCheck) {
            checkDomain(to, from, next, to.matched[i].meta);
            return;
        }
    }

    next();
};