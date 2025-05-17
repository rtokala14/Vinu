import Axios, { InternalAxiosRequestConfig, type AxiosRequestConfig } from 'axios';

import { store$ } from '~/stores';

export const AXIOS_INSTANCE = Axios.create();

AXIOS_INSTANCE.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const serverUrl = store$.settings.serverUrl.get();

    if (serverUrl && serverUrl !== '') {
      config.baseURL = serverUrl;
    } else {
      if (!config.url?.startsWith('http://') && !config.url?.startsWith('https://')) {
        console.warn(
          'Axios Interceptor: serverUrl is not set in store, and request URL is relative. Request may fail:',
          config.url
        );
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const customAxios = <T>(config: AxiosRequestConfig): Promise<T> => {
  const source = Axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query cancelled');
  };

  return promise;
};
