/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 *
 * Any modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Url from 'url';
import Https from 'https';
import Axios, { AxiosResponse } from 'axios';

import { isAxiosRequestError, isAxiosResponseError } from '../axios';
import { ToolingLog } from '../tooling_log';

const isConcliftOnGetError = (error: any) => {
  return (
    isAxiosResponseError(error) && error.config?.method === 'GET' && error.response.status === 409
  );
};

export const uriencode = (
  strings: TemplateStringsArray,
  ...values: Array<string | number | boolean>
) => {
  const queue = strings.slice();

  if (queue.length === 0) {
    throw new Error('how could strings passed to `uriencode` template tag be empty?');
  }

  if (queue.length !== values.length + 1) {
    throw new Error('strings and values passed to `uriencode` template tag are unbalanced');
  }

  // pull the first string off the queue, there is one less item in `values`
  // since the values are always wrapped in strings, so we shift the extra string
  // off the queue to balance the queue and values array.
  const leadingString = queue.shift()!;
  return queue.reduce(
    (acc, string, i) => `${acc}${encodeURIComponent(values[i])}${string}`,
    leadingString
  );
};

const DEFAULT_MAX_ATTEMPTS = 5;

export interface ReqOptions {
  description?: string;
  path: string;
  query?: Record<string, any>;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  retries?: number;
}

const delay = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

interface Options {
  url: string;
  certificateAuthorities?: Buffer[];
}

export class OsdClientRequester {
  private readonly url: string;
  private readonly httpsAgent: Https.Agent | null;

  constructor(private readonly log: ToolingLog, options: Options) {
    this.url = options.url;
    this.httpsAgent =
      Url.parse(options.url).protocol === 'https:'
        ? new Https.Agent({
            ca: options.certificateAuthorities,
          })
        : null;
  }

  private pickUrl() {
    return this.url;
  }

  public resolveUrl(relativeUrl: string = '/') {
    return Url.resolve(this.pickUrl(), relativeUrl);
  }

  async request<T>(options: ReqOptions): Promise<AxiosResponse<T>> {
    const url = Url.resolve(this.pickUrl(), options.path);
    const description = options.description || `${options.method} ${url}`;
    let attempt = 0;
    const maxAttempts = options.retries ?? DEFAULT_MAX_ATTEMPTS;

    while (true) {
      attempt += 1;

      try {
        const response = await Axios.request({
          method: options.method,
          url,
          data: options.body,
          params: options.query,
          headers: {
            'osd-xsrf': 'osd-client',
          },
          httpsAgent: this.httpsAgent,
        });

        return response;
      } catch (error) {
        const conflictOnGet = isConcliftOnGetError(error);
        const requestedRetries = options.retries !== undefined;
        const failedToGetResponse = isAxiosRequestError(error);

        let errorMessage;
        if (conflictOnGet) {
          errorMessage = `Conflict on GET (path=${options.path}, attempt=${attempt}/${maxAttempts})`;
          this.log.error(errorMessage);
        } else if (requestedRetries || failedToGetResponse) {
          errorMessage = `[${description}] request failed (attempt=${attempt}/${maxAttempts}): ${error.message}`;
          this.log.error(errorMessage);
        } else {
          throw error;
        }

        if (attempt < maxAttempts) {
          await delay(1000 * attempt);
          continue;
        }

        throw new Error(`${errorMessage} -- and ran out of retries`);
      }
    }
  }
}
