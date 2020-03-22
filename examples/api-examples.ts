import { loadList, qp, EntityApi, download, downloadList } from "../src/api"

interface User {
	id: number;
	firstName: string;
	lastName: string;
	age: number,
	gender: "zena" | "muz"
};

type UserEdit = User;

async function example1() {
	const result = await loadList<User>("/users", {
		paging: {
			page: 1,
			pageSize: 30
		},
		sorting: [
			["lastName", "desc"],
			"firstName",
		]
	});
}

async function example2() {
	const result = await loadList<User>("/users", {
		filter: {
			searchPhrase: "Novák",
			query: [
				qp("age", ">", 18),
				qp("gender", "=", "muz")
			]
		}
	})
}

async function example3() {
	const usersApi = new EntityApi<User, UserEdit>({ path: "/users" });
}

async function example4() {
	await download("/obchodni-podminky", "obchodni-podminky.pdf");
}

async function example5() {
	const query = {};
	await downloadList("/export", "exportovana_data.xls", query);
}