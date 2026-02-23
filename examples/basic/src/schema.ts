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
    contactMethod: {
      title: 'Preferred Contact Method',
      oneOf: [
        {
          title: 'Phone',
          type: 'object',
          properties: {
            method: { type: 'string', const: 'phone' },
            phoneNumber: { type: 'string', title: 'Phone Number' },
          },
          required: ['method', 'phoneNumber'],
        },
        {
          title: 'Mail',
          type: 'object',
          properties: {
            method: { type: 'string', const: 'mail' },
            mailingAddress: { type: 'string', title: 'Mailing Address' },
          },
          required: ['method', 'mailingAddress'],
        },
      ],
    },
    employmentStatus: {
      type: 'string',
      title: 'Employment Status',
      enum: ['employed', 'self-employed', 'unemployed', 'student'],
    },
  },
  required: ['firstName', 'lastName', 'email'],
  if: {
    properties: {
      employmentStatus: { const: 'employed' },
    },
    required: ['employmentStatus'],
  },
  then: {
    properties: {
      companyName: {
        type: 'string',
        title: 'Company Name',
        description: 'Shown when employment status is "employed"',
      },
      jobTitle: {
        type: 'string',
        title: 'Job Title',
      },
    },
  },
  else: {
    if: {
      properties: {
        employmentStatus: { const: 'self-employed' },
      },
      required: ['employmentStatus'],
    },
    then: {
      properties: {
        businessName: {
          type: 'string',
          title: 'Business Name',
          description: 'Shown when employment status is "self-employed"',
        },
      },
    },
  },
};
