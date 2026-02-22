import type { JSONSchema } from '@formica/core';

export const userProfileSchema: JSONSchema = {
  type: 'object',
  title: 'User Profile',
  properties: {
    firstName: {
      type: 'string',
      title: 'First Name',
    },
    lastName: {
      type: 'string',
      title: 'Last Name',
    },
    email: {
      type: 'string',
      title: 'Email',
      format: 'email',
      description: 'Your primary email address',
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0,
      maximum: 150,
    },
    role: {
      type: 'string',
      title: 'Role',
      enum: ['admin', 'editor', 'viewer'],
      description: 'User permission level',
    },
    active: {
      type: 'boolean',
      title: 'Active',
      description: 'Whether this account is active',
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: {
        street: { type: 'string', title: 'Street' },
        city: { type: 'string', title: 'City' },
        zip: { type: 'string', title: 'ZIP Code' },
      },
      required: ['street', 'city'],
    },
    website: {
      type: 'string',
      title: 'Website',
      format: 'uri',
      description: 'Personal or company website',
    },
    tags: {
      type: 'array',
      title: 'Tags',
      items: { type: 'string' },
      description: 'Categorization tags',
    },
    bio: {
      type: 'string',
      title: 'Bio',
      description: 'Short biography',
    },
  },
  required: ['firstName', 'lastName', 'email'],
};
