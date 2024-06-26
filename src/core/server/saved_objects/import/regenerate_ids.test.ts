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

import { mockUuidv4 } from './__mocks__';
import { regenerateIds } from './regenerate_ids';
import { SavedObject } from '../types';

describe('#regenerateIds', () => {
  const objects = ([
    { type: 'foo', id: '1' },
    { type: 'bar', id: '2' },
    { type: 'baz', id: '3' },
  ] as any) as SavedObject[];

  const dataSourceObjects = ([{ type: 'data-source', id: '1' }] as any) as SavedObject[];

  test('can filter out data source object', () => {
    expect(regenerateIds(dataSourceObjects, '').size).toBe(0);
  });

  test('returns expected values', () => {
    mockUuidv4
      .mockReturnValueOnce('uuidv4 #1')
      .mockReturnValueOnce('uuidv4 #2')
      .mockReturnValueOnce('uuidv4 #3');
    expect(regenerateIds(objects, '')).toMatchInlineSnapshot(`
      Map {
        "foo:1" => Object {
          "id": "uuidv4 #1",
          "omitOriginId": true,
        },
        "bar:2" => Object {
          "id": "uuidv4 #2",
          "omitOriginId": true,
        },
        "baz:3" => Object {
          "id": "uuidv4 #3",
          "omitOriginId": true,
        },
      }
    `);
  });
});
