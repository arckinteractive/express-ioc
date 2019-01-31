/**
 * IoC Container with support for scoped services
 * inspired by https://medium.com/the-everyday-developer/creating-an-ioc-container-with-dependency-injection-in-javascript-9db228d34060
 */
import Express from 'express';
import { createNamespace } from 'cls-hooked';
import uuid4 from 'uuid/v4';

export default class Container {
    static get proxy () {
        return {
            get (instance, property) {
                if (instance.$services.has(property)) {
                    return instance.get(property);
                }

                return instance[property];
            },
        };
    }

    static create (definitions = [], namespace) {
        namespace = namespace || createNamespace(uuid4());

        const container = new Container(namespace);
        const express = new Express();

        express.set('services', container);

        express.use((req, res, next) => {
            namespace.bindEmitter(req);
            namespace.bindEmitter(res);

            namespace.run(() => {
                next();
            });
        });

        definitions.forEach((definition) => {
            const {
                name,
                factory,
                dependencies,
                options,
            } = definition;

            container.register(name, factory, dependencies, options);
        });

        container.register('express', () => express);

        return container;
    }

    constructor (namespace) {
        this.$services = new Map();
        this.$singletons = new Map();
        this.$ns = namespace;

        return new Proxy(this, Container.proxy);
    }

    register (name, definition, dependencies, options) {
        options = Object.assign({
            singleton: true,
            scoped: false,
        }, options);

        this.$services.set(name, {
            definition,
            dependencies,
            ...options,
        });
    }

    get (name) {
        const service = this.$services.get(name);

        if (!service) {
            throw new Error(`Service ${name} has not been registered`);
        }

        if (typeof service.definition === 'function') {
            if (service.singleton) {
                let instance;

                if (service.scoped && this.$ns.active) {
                    instance = this.$ns.get(name);

                    if (!instance) {
                        instance = this.factory(service);
                        this.$ns.set(name, instance);
                    }
                } else {
                    instance = this.$singletons.get(name);

                    if (!instance) {
                        instance = this.factory(service);
                        this.$singletons.set(name, instance);
                    }
                }

                return instance;
            }

            return this.factory(service);
        }

        return service.definition;
    }

    resolveDeps (service) {
        let deps = [];

        if (service.dependencies) {
            deps = service.dependencies.map((dep) => {
                return this.get(dep);
            });
        }

        return deps;
    }

    factory (service) {
        const Constructor = service.definition;

        if (typeof Constructor.prototype !== 'undefined' && Constructor.prototype.constructor) {
            return new Constructor(...this.resolveDeps(service));
        }

        return Constructor(...this.resolveDeps(service));
    }

    reset () {
        this.$singletons = new Map();
    }
}
