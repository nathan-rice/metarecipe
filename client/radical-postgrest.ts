/// <reference path="radical.ts" />

import * as radical from 'radical';

interface IField {
    name: string;
    primary?: boolean;
}

class Field implements IField {
    protected inOperator = "in";
    protected isOperator = "is";
    protected eqOperator = "eq";
    protected notField: typeof Field = NotField;
    name: string;
    primary: boolean;
    not: Field;

    constructor(config?: IField) {
        this.configure(config);
    }

    protected configure(config?: IField) {
        this.not = new this.notField(config);
        // Since the not property has to exist on the not-field, might as well make it semi-functional
        this.not.not = this;
    }

    protected predicate(operator, value) {
        return new Predicate({field: this.name, operator: operator, value: value});
    }

    in(value: any[]) {
        return this.predicate(this.inOperator, value.join(","));
    }

    is(value: boolean) {
        let strValue = value === null ? "null" : value.toString();
        return this.predicate(this.isOperator, strValue);
    }

    equals(value) {
        return this.predicate(this.eqOperator, value);
    }

    orderAscending() {
        return this.name + ".asc";
    };

    orderDescending() {
        return this.name + ".desc";
    };
}

class NotField extends Field {
    protected predicate(operator, value) {
        return new Predicate({field: this.name, operator: "not." + operator, value: value});
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
        return this.predicate(this.likeOperator, value);
    }

    iLike(value: string) {
         return this.predicate(this.iLikeOperator, value);
    }

    fullTextSearch(value: string) {
        return this.predicate(this.fullTextSearchOperator, value);
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
        return this.predicate(this.greaterThanOperator, value);
    }

    lessThan(value: number) {
        return this.predicate(this.lessThanOperator, value);
    }

    greaterThanOrEqualTo(value: number) {
        return this.predicate(this.greaterThanOrEqualToOperator, value);
    }

    lessThanOrEqualTo(value: number) {
        return this.predicate(this.lessThanOrEqualToOperator, value);
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

interface IModel {
    name?: string;
    fields?: Field[];
    hash?: Function;
}

class Model {

    protected primary;
    name: string;

    constructor(config?: IModel) {
        this.configure(config);
    }

    configure(config?: IModel) {
        if (config) Object.assign(this, config);
        this.primary = [];
        for (let key in this) {
            if (this[key] instanceof Field && this[key].primary) {
                this.primary.push({name: key, field: this[key]});
            }
        }
    }

    static create(config?: IModel) {
        return new this().configure(config);
    }

    hash = (instance) => {
        if (!this.primary.length) {
            throw new Error("All models must have at least one primary field, or specify a hash function");
        }
        var key = instance[this.primary[0].name];
        this.primary.slice(1).forEach(primary => key += ":" + instance[primary.name]);
        return key;
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