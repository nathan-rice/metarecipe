/// <reference path="radical.ts" />
/// <reference path="definitions/jquery/jquery.d.ts" />
/// <reference path="definitions/immutable/immutable.d.ts" />
/// <reference path="definitions/redux/redux.d.ts" />


import Immutable = require('immutable');
import jQuery = require('jquery');
import radical = require('radical');
import {CollectionAction, CollectionNamespace, Endpoint, IAction} from "./radical";
import IEndpointExecutionParameters from "./radical";


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
        return new Predicate(this.name, operator, value);
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
        return new Predicate(this.name, "not." + operator, value);
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
        return new Predicate(this.name, "not." + operator, value);
    }

    protected configure() {
        // Empty override to prevent infinite recursion
    }
}

class Predicate {
    constructor(public field: string, public operator: string, public argument: string) {}
}

interface IQueryConfiguration {
    predicates?: Predicate[],
    limit?: number;
    offset?: number;
    orderBy?: string[];
}

interface IModelConfiguration {
    name?: string;
    defaultQueryConfiguration?: IQueryConfiguration
}

class Model {

    name: string;

    defaultQuery: IQueryConfiguration = {
        predicates: [],
        limit: 10,
    };

    query: IQueryConfiguration = {
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

interface ICrudAction extends IAction {
    model?: Model;
}

class CollectionCrudAction extends CollectionAction {
    model: Model;
    configure(config?: ICrudAction) {
        if (config.model) {
            this.model = config.model;
            if (this.name) {
                // The name field was defined directly on the class
                this.name = config.model.name + ": " + this.name;
            } else if (config.name) {
                this.name = config.model.name + ": " + config.name;
                // Removing the name property
                delete config.name;
            }

        }
        super.configure(config);
        return this;
    }
}

class Create extends CollectionCrudAction {
    name = "create";

    endpoint = Endpoint.create({
        method: "POST",
        headers: ['Prefer: return=representation', 'Range-Unit: items']
    });

    initiator = function(action, predicate) {
        let parameters: IEndpointExecutionParameters = {
            arguments: this.model.toUrlArguments(),
            success: data => {
                action.getStore().dispatch({
                    type: action.name
                })
            }
        };
        if (this.model.query.offset || this.model.query.limit) {
            let fromIdx = this.model.query.offset || 0,
                toIdx = this.model.query.limit ? fromIdx + this.model.query.limit : "";
            parameters.headers = ['Range: ' + fromIdx + '-' + toIdx];
        }
        action.endpoint.execute(parameters);
    };

    reducer = (state, action) => {
        return state;
    };

 }

class Read extends CollectionAction {
    initiator = function(action, predicate) {

    };

    reducer = (state, action) => {
        return state;
    }
}

class Update extends CollectionAction {
    initiator = function(action, predicate) {

    };

    reducer = (state, action) => {
        return state;
    }
}

class Delete extends CollectionAction {
    initiator = function(action, predicate) {

    };

    reducer = (state, action) => {
        return state;
    }
}

class DataService extends CollectionNamespace {
    model: Model;
    create: Create;
    read: Read;
    update: Update;
    delete: Delete;
}