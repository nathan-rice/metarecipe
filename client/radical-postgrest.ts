/// <reference path="radical.ts" />

import radical = require('radical');

class Field {

    protected model: Model;
    protected inOperator = "in";
    protected isOperator = "is";
    protected eqOperator = "eq";
    protected notField: typeof Field = NotField;
    not: Field;

    constructor(public name: string, public primary?: boolean) {
        this.configure();
    }

    protected configure() {
        this.not = new this.notField(this.name, this.primary);
        // Since the not property has to exist on the not-field, might as well make it semi-functional
        this.not.not = this;
    }

    protected predicate(operator, value) {
        return new Predicate({field: this.name, operator: operator, value: value});
    }

    in(value: any[]) {
        this.model.addQueryPredicate(this.predicate(this.inOperator, value.join(",")));
        return this.model;
    }

    is(value: boolean) {
        let strValue = value === null ? "null" : value.toString();
        this.model.addQueryPredicate(this.predicate(this.isOperator, strValue));
        return this.model;
    }

    equals(value) {
        this.model.addQueryPredicate(this.predicate(this.eqOperator, value));
        return this.model;
    }

    orderByAscending() {
        this.model.orderBy(this.name + ".asc");
        return this.model;
    };

    orderByDescending() {
        this.model.orderBy(this.name + ".desc");
        return this.model;
    };
}

class NotField extends Field {
    protected predicate(operator, value) {
        return new Predicate(this.name, "not." + operator, value);
    }

    protected configure() {
        // Empty override to prevent infinite recursion
    }
}

class TextField extends Field {
    protected likeOperator = "like";
    protected iLikeOperator = "ilike";
    protected fullTextSearchOperator = "@@";
    protected notField = NotTextField;
    not: NotTextField;

    like(value: string) {
        this.model.addQueryPredicate(this.predicate(this.likeOperator, value));
        return this.model;
    }

    iLike(value: string) {
        this.model.addQueryPredicate(this.predicate(this.iLikeOperator, value));
        return this.model;
    }

    fullTextSearch(value: string) {
        this.model.addQueryPredicate(this.predicate(this.fullTextSearchOperator, value));
        return this.model;
    }

}

class NotTextField extends TextField {
    protected predicate(operator, value) {
        return new Predicate({field: this.name, operator: "not." + operator, value: value});
    }

    protected configure() {
        // Empty override to prevent infinite recursion
    }
}

class NumericField extends Field {
    protected greaterThanOperator = "gt";
    protected lessThanOperator = "lt";
    protected greaterThanOrEqualToOperator = "gte";
    protected lessThanOrEqualToOperator = "lt";
    protected notField = NotNumericField;
    not: NotNumericField;

    greaterThan(value: number) {
        this.model.addQueryPredicate(this.predicate(this.greaterThanOperator, value));
        return this.model;
    }

    lessThan(value: number) {
        this.model.addQueryPredicate(this.predicate(this.lessThanOperator, value));
        return this.model;
    }

    greaterThanOrEqualTo(value: number) {
        this.model.addQueryPredicate(this.predicate(this.greaterThanOrEqualToOperator, value));
        return this.model;
    }

    lessThanOrEqualTo(value: number) {
        this.model.addQueryPredicate(this.predicate(this.lessThanOrEqualToOperator, value));
        return this.model;
    }
}

class NotNumericField extends NumericField {
    protected predicate(operator, value) {
        return new Predicate({field: this.name, operator: "not." + operator, value: value});
    }

    protected configure() {
        // Empty override to prevent infinite recursion
    }
}

interface IPredicate {
    field: string;
    operator: string;
    value: string;
}

class Predicate implements IPredicate {
    field: string;
    operator: string;
    value: string;

    constructor(config?: IPredicate) {
        if (config) Object.assign(this, config);
    }

    toUrlArgument() {
        return {argument: this.field, value: this.operator + '.' + this.value}
    }
}

interface IQuery {
    predicates: Predicate[],
    limit: number;
    offset: number;
    orderBy: string[];
}

class Query implements IQuery {
    predicates: Predicate[] = [];
    limit: number;
    offset: number;
    orderBy: string[] = [];

    constructor(config?: IQuery) {
        if (config) Object.assign(this, config);
    }

    urlArguments() {
        var ordering = this.orderingUrlArgument(), args = ordering ? [ordering] : [];
        this.predicates.forEach((predicate) => args.push(predicate.toUrlArgument()));
        return args;
    }

    protected orderingUrlArgument() {
        if (this.orderBy.length) {
            return {argument: "order", value: this.orderBy.join(",")}
        } else return null;
    }

    requestHeaders() {
        let headers = [], start, end;
        if (this.offset || this.limit) {
            start = this.offset || 0;
            end = this.limit ? start + this.limit : "";
            headers.push("Range: " + start + "-" + end);
        }
        return headers;
    }
}

interface IModelConfiguration {
    name?: string;
    defaultQueryConfiguration?: IQuery
}

class Model {

    name: string;

    defaultQuery: IQuery = {
        predicates: [],
        limit: 10,
    };

    query: IQuery = {
        predicates: []
    };

    addQueryPredicate(predicate: Predicate) {
        this.query.predicates.push(predicate)
    }

    limit(value: number) {
        this.query.limit = value;
        return this;
    }

    offset(value: number) {
        this.query.offset = value;
        return this;
    };

    orderBy(clause) {
        this.query.orderBy.push(clause);
    }

    toUrlArguments() {
        var args = [];
        this.query.predicates.forEach((predicate) => {
            args.push({argument: predicate.field, value: predicate.operator + '.' + predicate.argument})
        });
        args.push({argument: "order", value: this.query.orderBy.join(",")});
        return args;
    }

    newQuery() {
        this.query = {};
        for (let key in this.defaultQuery) {
            if (key == "predicates" || key == "orderBy") {
                this.query[key] = this.defaultQuery[key].slice();
            } else {
                this.query[key] = this.defaultQuery[key]
            }
        }
        return this;
    }

    saveQueryAsDefault() {
        this.defaultQuery = {};
        for (let key in this.query) {
            if (key == "predicates" || key == "orderBy") {
                this.defaultQuery[key] = this.query[key].slice();
            } else {
                this.defaultQuery[key] = this.query[key]
            }
        }
        return this;
    }

    constructor(config?: IModelConfiguration) {
        this.configure(config);
    }

    configure(config?: IModelConfiguration) {
        for (let key in this) {
            if (this[key] instanceof Field) {
                this[key].model = this;
                this[key].not.model = this;
            }
        }
        if (config) {
            if (config.name) this.name = config.name;
            if (config.defaultQueryConfiguration) {
                for (let key in config.defaultQueryConfiguration) {
                    this.defaultQuery[key] = config.defaultQueryConfiguration[key];
                }
            }
        }
    }

    static create(config?: IModelConfiguration) {
        return new this().configure(config);
    }
}

interface ICrudAction extends radical.IAction {
    instanceFactory?: Function;
    instanceKey?: Function;
}

class CollectionCrudAction extends radical.CollectionAction {
    instanceFactory: Function;
    instanceKey: Function;

    configure(config?: ICrudAction) {
        if (config) {
            if (config.instanceFactory) this.instanceFactory = config.instanceFactory;
            if (config.instanceKey) this.instanceKey = config.instanceKey;
        }
        super.configure(config);
        return this;
    }

    reducer = (state, action) => {
        let instances = action.instances
            .map(this.instanceFactory)
            .reduce((entries, entry) => entries.set(this.instanceKey(entry), entry), state.get("instances"));
        return state.set("instances", instances);
    };
}


class Create extends CollectionCrudAction {
    endpoint = radical.JsonEndpoint.create({
        method: "POST",
        headers: ['Prefer: return=representation']
    });

    initiator = function(action, objects) {
        action.endpoint.execute({
            data: objects,
            success: response => {
                action.getStore().dispatch({type: action.name, instances: response})
            }
        });
    };
 }

class Read extends CollectionCrudAction {
    endpoint = radical.JsonEndpoint.create({
        headers: ['Range-Unit: items']
    });

    initiator = function(action, predicate) {
        // TODO: need to figure out how queries should be constructed and passed
        action.endpoint.execute({
            headers: [this.paginationHeader()],
            success: response => {
                action.getStore().dispatch({type: action.name, instances: response})
            }
        });
    };
}

class Update extends CollectionCrudAction {
    initiator = function(action, attributes, predicate) {

    };
}

class Delete extends CollectionCrudAction {
    initiator = function(action, predicate) {

    };

    reducer = (state, action) => {
        // The fact that we don't convert the returned json to an instance might cause issues with instanceKey
        let deletedInstanceKeys = new Set(action.instances.map(this.instanceKey)),
            instances = state.get("instances").filter(instance => deletedInstanceKeys.has(this.instanceKey(instance)));
        return state.set("instances", instances);
    }
}

class DataService extends radical.CollectionNamespace {
    model: Model;
    create: Create;
    read: Read;
    update: Update;
    delete: Delete;
}