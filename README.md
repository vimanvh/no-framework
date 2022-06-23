No Framework
============

[API](./api.ts)\
Module for calling REST API methods in our technology stack. Main features are:

- typed input/response structures
- support for lists paginated and with typed structured queries 
- support for automatic definition of standard CRUD and bulk operations for generic entity type 
- typed ensapsulation for calling low level HTTP library
- automatic deserialization of dates

[State management container](./state.ts)\
Module for creating state management containers that are decoupled from React components. These containers allow to separate module logic from JSX templates. It comes form old React days when Redux brought to big boilerplate and
Context API has not been stabilized. It uses only the plain principle of immutability, spread operators and transparent binding to React state. These state container can work even without bounded React component that can be useful for testability.
