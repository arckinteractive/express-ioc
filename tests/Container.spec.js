import Container from '../src/Container';
import { expect } from 'chai';
import request from 'supertest';

class TestService {
    constructor (parent) {
        this.parent = parent;
    }

    getFoo () {
        return this.parent.foo;
    }
}

describe('Container', () => {
    it('should use proxy', () => {
        const services = Container.create();

        services.register('foo', 'bar');

        expect(services.foo).to.equal(services.get('foo'));
    });

    it ('should throw if service is undefined', () => {
        const services = Container.create();

        expect(() => services.foo).to.throw;
    });

    it('should create new container from an array of definitions', () => {
        const definitions = [
            {
                name: 'parent',
                factory: () => {
                    return {
                        foo: 'bar',
                    };
                },
            },
            {
                name: 'child',
                factory: TestService,
                dependencies: ['parent'],
            },
        ];

        const services = Container.create(definitions);

        expect(services.parent.foo).to.equal('bar');
        expect(services.child.getFoo()).to.equal('bar');

        services.parent.foo = 'bar2';

        expect(services.parent.foo).to.equal('bar2');
        expect(services.child.getFoo()).to.equal('bar2');
    });

    it('should scope services', async () => {
        const singletons = [];

        const services = Container.create();

        services.register('scoped', () => 'foo', null, { scoped: true });
        services.register('unscoped', () => 'bar');

        const app = services.express;

        app.get('/', (req, res) => {
            singletons.push({
                scoped: req.app.get('services').scoped,
                unscoped: req.app.get('services').unscoped,
            });

            res.send('Ok');
        });

        await Promise.all([
            request(app)
                .get('/')
                .expect(200),

            request(app)
                .get('/')
                .expect(200),
        ]);

        expect(singletons[0].unscoped === singletons[1].unscoped).to.be.true;
        expect(singletons[0].scoped === singletons[1].scoped).to.be.false;
    });
});
