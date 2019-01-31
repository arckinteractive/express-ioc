IoC Container for Express
=========================

A very simple IoC container for Node/Express. 

Principles used for this container are outline in this medium article:
https://medium.com/@ismayilkhayredinov/building-a-scoped-ioc-container-for-node-express-8bf082d9887


## Usage

You can construct a new container from an array of service definitions:

```js
import { Container } from 'express-ioc';

// Create a container from an array of service definitions
const definitions = [
    {
        name: 'serviceA',
        factory: () => 'FOO',
    },
];

const services = Container.create(definitions);
```

Each definition has a `name`, `factory`, `dependencies` and `options`.

A factory is function/constructor that will receive dependencies as arguments.

```js
// Register new services at runtime

// Service factory as a class name
class ServiceBConstructor {
    constructor (depA) {
        
    }
}
services.register('serviceB', ServiceBConstructor, ['serviceA']);

// Service as a plain object
const config = {};
services.register('serviceC', () => config);

// Scoped service (bound to a specific express request, e.g. session)
const scoped = (depA) => {
    return {};
};
services.register('serviceD', scoped, ['serviceA'], { scoped: true });
```

Once you access a service by its name, it's turned into a singleton, and you get the same instance of the service on consecutive calls:

```js
const serviceA = services.get('serviceA');
// or
const { serviceB } = services;
```

Express will be instantiated when you create a new container and injected as a service after being bound to a cls-hooked namespace, so be sure to use the same express instance, when registering middleware.

```js
// some middleware in some external module
export default (req, res, next) => {
    const services = req.app.get('services');
                   
    services.serviceA.doStuff();
                   
    next();
}
```

```js
// your app booting module
import Container from 'express-ioc';
import middleware from './some-external-module';

const services = Container.create();

const { express } = services;

express.use(middleware);
```
